/**
 * Role management service for user privileges and broker functionality
 */

import { supabase } from '../lib/supabase';
import { UserRole, UserProfile, BrokerProfile, ROLE_PERMISSIONS } from '../types/user';

export class RoleService {
  // Create a new broker account with firm
  static async createBrokerAccount(
    email: string, 
    password: string, 
    brokerInfo: {
      firstName: string;
      lastName: string;
      phone: string;
      licenseNumber: string;
      firmName: string;
      firmLicense: string;
      firmAddress: string;
      firmPhone: string;
      firmEmail: string;
    }
  ): Promise<{ success: boolean; error?: string; brokerId?: string }> {
    try {
      // 1. Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: brokerInfo.firstName,
            last_name: brokerInfo.lastName,
            phone: brokerInfo.phone,
            role: 'primary_broker'
          }
        }
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create user account' };
      }

      // 2. Create the firm
      const { data: firmData, error: firmError } = await supabase
        .from('firms')
        .insert({
          name: brokerInfo.firmName,
          license_number: brokerInfo.firmLicense,
          address: brokerInfo.firmAddress,
          phone: brokerInfo.firmPhone,
          email: brokerInfo.firmEmail,
          subscription_tier: 'professional',
          seats_purchased: 10,
          seats_used: 1
        })
        .select()
        .single();

      if (firmError || !firmData) {
        return { success: false, error: firmError?.message || 'Failed to create firm' };
      }

      // 3. Create/update the user profile
      const { error: profileError } = await supabase
        .from('Profile')
        .upsert({
          id: authData.user.id,
          email: email,
          first_name: brokerInfo.firstName,
          last_name: brokerInfo.lastName,
          phone: brokerInfo.phone,
          role: 'primary_broker' as UserRole,
          firm_id: firmData.id,
          license_number: brokerInfo.licenseNumber,
          verified_investor: false
        });

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      return { success: true, brokerId: authData.user.id };
    } catch (error) {
      console.error('Error creating broker account:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Upgrade existing user to broker
  static async upgradeToBroker(
    userEmail: string,
    brokerInfo: {
      licenseNumber: string;
      firmName: string;
      firmLicense: string;
      firmAddress: string;
      firmPhone: string;
      firmEmail: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Find the user by email
      const { data: userData, error: userError } = await supabase
        .from('Profile')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .single();

      if (userError || !userData) {
        return { success: false, error: 'User not found' };
      }

      // 2. Create the firm
      const { data: firmData, error: firmError } = await supabase
        .from('firms')
        .insert({
          name: brokerInfo.firmName,
          license_number: brokerInfo.firmLicense,
          address: brokerInfo.firmAddress,
          phone: brokerInfo.firmPhone,
          email: brokerInfo.firmEmail,
          subscription_tier: 'professional',
          seats_purchased: 10,
          seats_used: 1
        })
        .select()
        .single();

      if (firmError || !firmData) {
        return { success: false, error: firmError?.message || 'Failed to create firm' };
      }

      // 3. Update user profile to broker
      const { error: updateError } = await supabase
        .from('Profile')
        .update({
          role: 'primary_broker' as UserRole,
          firm_id: firmData.id,
          license_number: brokerInfo.licenseNumber
        })
        .eq('id', userData.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // 4. Update user metadata in auth
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { role: 'primary_broker' }
      });

      if (metadataError) {
        console.warn('Failed to update user metadata:', metadataError.message);
      }

      return { success: true };
    } catch (error) {
      console.error('Error upgrading to broker:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Get user profile with role information
  static async getUserProfile(userId: string): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('Profile')
        .select(`
          *,
          firms (
            id,
            name,
            license_number,
            address,
            phone,
            email,
            subscription_tier,
            seats_purchased,
            seats_used
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, profile: data };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Check user permissions
  static hasPermission(userRole: UserRole, permission: keyof typeof ROLE_PERMISSIONS.customer): boolean {
    return ROLE_PERMISSIONS[userRole][permission];
  }

  // Get all brokers
  static async getAllBrokers(): Promise<{ success: boolean; brokers?: BrokerProfile[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('Profile')
        .select(`
          *,
          firms (
            id,
            name,
            license_number,
            address,
            phone,
            email,
            subscription_tier,
            seats_purchased,
            seats_used
          )
        `)
        .eq('role', 'primary_broker');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, brokers: data as BrokerProfile[] };
    } catch (error) {
      console.error('Error getting brokers:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Update user role (admin function)
  static async updateUserRole(userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('Profile')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Quick broker setup for existing email/password
  static async quickBrokerSetup(
    email: string,
    defaultBrokerInfo?: Partial<{
      licenseNumber: string;
      firmName: string;
      firmLicense: string;
      firmAddress: string;
      firmPhone: string;
      firmEmail: string;
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const brokerInfo = {
        licenseNumber: defaultBrokerInfo?.licenseNumber || 'FL-BK-999999',
        firmName: defaultBrokerInfo?.firmName || 'Hatch Realty Group',
        firmLicense: defaultBrokerInfo?.firmLicense || 'FL-FIRM-999999',
        firmAddress: defaultBrokerInfo?.firmAddress || '123 Main St, Miami, FL 33101',
        firmPhone: defaultBrokerInfo?.firmPhone || '(305) 555-0100',
        firmEmail: defaultBrokerInfo?.firmEmail || email
      };

      const result = await this.upgradeToBroker(email, brokerInfo);
      return result;
    } catch (error) {
      console.error('Error in quick broker setup:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}