import { z } from 'zod';
export declare const leadRoutingModeSchema: z.ZodEnum<["FIRST_MATCH", "SCORE_AND_ASSIGN"]>;
export type LeadRoutingMode = z.infer<typeof leadRoutingModeSchema>;
export declare const routingMatchModeSchema: z.ZodEnum<["ANY", "ALL"]>;
export type RoutingMatchMode = z.infer<typeof routingMatchModeSchema>;
export declare const routingStringSetFilterSchema: z.ZodObject<{
    include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
}, "strip", z.ZodTypeAny, {
    include?: string[] | undefined;
    exclude?: string[] | undefined;
    match?: "ANY" | "ALL" | undefined;
}, {
    include?: string[] | undefined;
    exclude?: string[] | undefined;
    match?: "ANY" | "ALL" | undefined;
}>;
export type RoutingStringSetFilter = z.infer<typeof routingStringSetFilterSchema>;
export declare const leadRoutingConsentStateSchema: z.ZodEnum<["GRANTED", "REVOKED", "UNKNOWN"]>;
export type LeadRoutingConsentState = z.infer<typeof leadRoutingConsentStateSchema>;
export declare const leadRoutingConsentRequirementSchema: z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>;
export type LeadRoutingConsentRequirement = z.infer<typeof leadRoutingConsentRequirementSchema>;
export declare const leadRoutingBuyerRepRequirementSchema: z.ZodEnum<["ANY", "REQUIRED_ACTIVE", "PROHIBIT_ACTIVE"]>;
export type LeadRoutingBuyerRepRequirement = z.infer<typeof leadRoutingBuyerRepRequirementSchema>;
export declare const leadRoutingDaysOfWeekSchema: z.ZodArray<z.ZodNumber, "many">;
export declare const leadRoutingTimeWindowSchema: z.ZodObject<{
    timezone: z.ZodString;
    start: z.ZodString;
    end: z.ZodString;
    days: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "strip", z.ZodTypeAny, {
    timezone: string;
    start: string;
    end: string;
    days?: number[] | undefined;
}, {
    timezone: string;
    start: string;
    end: string;
    days?: number[] | undefined;
}>;
export type LeadRoutingTimeWindow = z.infer<typeof leadRoutingTimeWindowSchema>;
export declare const leadRoutingGeographySchema: z.ZodOptional<z.ZodObject<{
    includeStates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeCities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includePostalCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    excludeStates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    excludeCities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    excludePostalCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    includeStates?: string[] | undefined;
    includeCities?: string[] | undefined;
    includePostalCodes?: string[] | undefined;
    excludeStates?: string[] | undefined;
    excludeCities?: string[] | undefined;
    excludePostalCodes?: string[] | undefined;
}, {
    includeStates?: string[] | undefined;
    includeCities?: string[] | undefined;
    includePostalCodes?: string[] | undefined;
    excludeStates?: string[] | undefined;
    excludeCities?: string[] | undefined;
    excludePostalCodes?: string[] | undefined;
}>>;
export type LeadRoutingGeographyCondition = z.infer<typeof leadRoutingGeographySchema>;
export declare const leadRoutingPriceBandSchema: z.ZodOptional<z.ZodObject<{
    min: z.ZodOptional<z.ZodNumber>;
    max: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    min?: number | undefined;
    max?: number | undefined;
    currency?: string | undefined;
}, {
    min?: number | undefined;
    max?: number | undefined;
    currency?: string | undefined;
}>>;
export type LeadRoutingPriceBandCondition = z.infer<typeof leadRoutingPriceBandSchema>;
export declare const leadRoutingSourceSchema: z.ZodOptional<z.ZodObject<{
    include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}, {
    include?: string[] | undefined;
    exclude?: string[] | undefined;
}>>;
export type LeadRoutingSourceCondition = z.infer<typeof leadRoutingSourceSchema>;
export declare const leadRoutingConsentConditionSchema: z.ZodOptional<z.ZodObject<{
    sms: z.ZodOptional<z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>>;
    email: z.ZodOptional<z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>>;
}, "strip", z.ZodTypeAny, {
    sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
    email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
}, {
    sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
    email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
}>>;
export type LeadRoutingConsentCondition = z.infer<typeof leadRoutingConsentConditionSchema>;
export declare const leadRoutingDemographicsSchema: z.ZodOptional<z.ZodObject<{
    minAge: z.ZodOptional<z.ZodNumber>;
    maxAge: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }>>;
    languages: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }>>;
    ethnicities: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    minAge?: number | undefined;
    maxAge?: number | undefined;
    tags?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    languages?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    ethnicities?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
}, {
    minAge?: number | undefined;
    maxAge?: number | undefined;
    tags?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    languages?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    ethnicities?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
}>>;
export type LeadRoutingDemographicsCondition = z.infer<typeof leadRoutingDemographicsSchema>;
export declare const leadRoutingCustomFieldOperatorSchema: z.ZodEnum<["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "GT", "GTE", "LT", "LTE", "CONTAINS", "NOT_CONTAINS", "EXISTS", "NOT_EXISTS"]>;
export type LeadRoutingCustomFieldOperator = z.infer<typeof leadRoutingCustomFieldOperatorSchema>;
export declare const leadRoutingCustomFieldConditionSchema: z.ZodObject<{
    key: z.ZodString;
    operator: z.ZodEnum<["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "GT", "GTE", "LT", "LTE", "CONTAINS", "NOT_CONTAINS", "EXISTS", "NOT_EXISTS"]>;
    value: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    key: string;
    operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
    value?: any;
}, {
    key: string;
    operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
    value?: any;
}>;
export type LeadRoutingCustomFieldCondition = z.infer<typeof leadRoutingCustomFieldConditionSchema>;
export declare const leadRoutingConditionsSchema: z.ZodObject<{
    geography: z.ZodOptional<z.ZodObject<{
        includeStates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        includeCities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        includePostalCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludeStates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludeCities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        excludePostalCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        includeStates?: string[] | undefined;
        includeCities?: string[] | undefined;
        includePostalCodes?: string[] | undefined;
        excludeStates?: string[] | undefined;
        excludeCities?: string[] | undefined;
        excludePostalCodes?: string[] | undefined;
    }, {
        includeStates?: string[] | undefined;
        includeCities?: string[] | undefined;
        includePostalCodes?: string[] | undefined;
        excludeStates?: string[] | undefined;
        excludeCities?: string[] | undefined;
        excludePostalCodes?: string[] | undefined;
    }>>;
    priceBand: z.ZodOptional<z.ZodObject<{
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        min?: number | undefined;
        max?: number | undefined;
        currency?: string | undefined;
    }, {
        min?: number | undefined;
        max?: number | undefined;
        currency?: string | undefined;
    }>>;
    sources: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    }>>;
    consent: z.ZodOptional<z.ZodObject<{
        sms: z.ZodOptional<z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>>;
        email: z.ZodOptional<z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>>;
    }, "strip", z.ZodTypeAny, {
        sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
    }, {
        sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
    }>>;
    buyerRep: z.ZodOptional<z.ZodEnum<["ANY", "REQUIRED_ACTIVE", "PROHIBIT_ACTIVE"]>>;
    timeWindows: z.ZodOptional<z.ZodArray<z.ZodObject<{
        timezone: z.ZodString;
        start: z.ZodString;
        end: z.ZodString;
        days: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        start: string;
        end: string;
        days?: number[] | undefined;
    }, {
        timezone: string;
        start: string;
        end: string;
        days?: number[] | undefined;
    }>, "many">>;
    demographics: z.ZodOptional<z.ZodObject<{
        minAge: z.ZodOptional<z.ZodNumber>;
        maxAge: z.ZodOptional<z.ZodNumber>;
        tags: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        languages: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        ethnicities: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        minAge?: number | undefined;
        maxAge?: number | undefined;
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        ethnicities?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
    }, {
        minAge?: number | undefined;
        maxAge?: number | undefined;
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        ethnicities?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
    }>>;
    customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        operator: z.ZodEnum<["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "GT", "GTE", "LT", "LTE", "CONTAINS", "NOT_CONTAINS", "EXISTS", "NOT_EXISTS"]>;
        value: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
        value?: any;
    }, {
        key: string;
        operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
        value?: any;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    geography?: {
        includeStates?: string[] | undefined;
        includeCities?: string[] | undefined;
        includePostalCodes?: string[] | undefined;
        excludeStates?: string[] | undefined;
        excludeCities?: string[] | undefined;
        excludePostalCodes?: string[] | undefined;
    } | undefined;
    priceBand?: {
        min?: number | undefined;
        max?: number | undefined;
        currency?: string | undefined;
    } | undefined;
    sources?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | undefined;
    consent?: {
        sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
    } | undefined;
    buyerRep?: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE" | undefined;
    timeWindows?: {
        timezone: string;
        start: string;
        end: string;
        days?: number[] | undefined;
    }[] | undefined;
    demographics?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        ethnicities?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
    } | undefined;
    customFields?: {
        key: string;
        operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
        value?: any;
    }[] | undefined;
}, {
    geography?: {
        includeStates?: string[] | undefined;
        includeCities?: string[] | undefined;
        includePostalCodes?: string[] | undefined;
        excludeStates?: string[] | undefined;
        excludeCities?: string[] | undefined;
        excludePostalCodes?: string[] | undefined;
    } | undefined;
    priceBand?: {
        min?: number | undefined;
        max?: number | undefined;
        currency?: string | undefined;
    } | undefined;
    sources?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
    } | undefined;
    consent?: {
        sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
    } | undefined;
    buyerRep?: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE" | undefined;
    timeWindows?: {
        timezone: string;
        start: string;
        end: string;
        days?: number[] | undefined;
    }[] | undefined;
    demographics?: {
        minAge?: number | undefined;
        maxAge?: number | undefined;
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        ethnicities?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
    } | undefined;
    customFields?: {
        key: string;
        operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
        value?: any;
    }[] | undefined;
}>;
export type LeadRoutingConditions = z.infer<typeof leadRoutingConditionsSchema>;
export declare const leadRoutingAgentFilterSchema: z.ZodObject<{
    tags: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }>>;
    languages: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }>>;
    specialties: z.ZodOptional<z.ZodObject<{
        include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
    }, "strip", z.ZodTypeAny, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }, {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    }>>;
    minKeptApptRate: z.ZodOptional<z.ZodNumber>;
    minCapacityRemaining: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tags?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    languages?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    specialties?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    minKeptApptRate?: number | undefined;
    minCapacityRemaining?: number | undefined;
}, {
    tags?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    languages?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    specialties?: {
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        match?: "ANY" | "ALL" | undefined;
    } | undefined;
    minKeptApptRate?: number | undefined;
    minCapacityRemaining?: number | undefined;
}>;
export type LeadRoutingAgentFilter = z.infer<typeof leadRoutingAgentFilterSchema>;
export declare const leadRoutingTargetSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"AGENT">;
    id: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    agentFilter: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        languages: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        specialties: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        minKeptApptRate: z.ZodOptional<z.ZodNumber>;
        minCapacityRemaining: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    }, {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "AGENT";
    id: string;
    label?: string | undefined;
    agentFilter?: {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    } | undefined;
}, {
    type: "AGENT";
    id: string;
    label?: string | undefined;
    agentFilter?: {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    } | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"TEAM">;
    id: z.ZodString;
    strategy: z.ZodDefault<z.ZodEnum<["BEST_FIT", "ROUND_ROBIN"]>>;
    includeRoles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    agentFilter: z.ZodOptional<z.ZodObject<{
        tags: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        languages: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        specialties: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        }>>;
        minKeptApptRate: z.ZodOptional<z.ZodNumber>;
        minCapacityRemaining: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    }, {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "TEAM";
    id: string;
    strategy: "BEST_FIT" | "ROUND_ROBIN";
    agentFilter?: {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    } | undefined;
    includeRoles?: string[] | undefined;
}, {
    type: "TEAM";
    id: string;
    agentFilter?: {
        tags?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        languages?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        specialties?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
            match?: "ANY" | "ALL" | undefined;
        } | undefined;
        minKeptApptRate?: number | undefined;
        minCapacityRemaining?: number | undefined;
    } | undefined;
    strategy?: "BEST_FIT" | "ROUND_ROBIN" | undefined;
    includeRoles?: string[] | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"POND">;
    id: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "POND";
    id: string;
    label?: string | undefined;
}, {
    type: "POND";
    id: string;
    label?: string | undefined;
}>]>;
export type LeadRoutingTarget = z.infer<typeof leadRoutingTargetSchema>;
export declare const leadRoutingFallbackSchema: z.ZodOptional<z.ZodObject<{
    teamId: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    escalationChannels: z.ZodOptional<z.ZodArray<z.ZodEnum<["EMAIL", "SMS", "IN_APP"]>, "many">>;
    relaxAgentFilters: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    teamId: string;
    label?: string | undefined;
    escalationChannels?: ("EMAIL" | "SMS" | "IN_APP")[] | undefined;
    relaxAgentFilters?: boolean | undefined;
}, {
    teamId: string;
    label?: string | undefined;
    escalationChannels?: ("EMAIL" | "SMS" | "IN_APP")[] | undefined;
    relaxAgentFilters?: boolean | undefined;
}>>;
export type LeadRoutingFallback = z.infer<typeof leadRoutingFallbackSchema>;
export declare const leadRoutingRuleConfigSchema: z.ZodObject<{
    conditions: z.ZodDefault<z.ZodObject<{
        geography: z.ZodOptional<z.ZodObject<{
            includeStates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            includeCities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            includePostalCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            excludeStates: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            excludeCities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            excludePostalCodes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            includeStates?: string[] | undefined;
            includeCities?: string[] | undefined;
            includePostalCodes?: string[] | undefined;
            excludeStates?: string[] | undefined;
            excludeCities?: string[] | undefined;
            excludePostalCodes?: string[] | undefined;
        }, {
            includeStates?: string[] | undefined;
            includeCities?: string[] | undefined;
            includePostalCodes?: string[] | undefined;
            excludeStates?: string[] | undefined;
            excludeCities?: string[] | undefined;
            excludePostalCodes?: string[] | undefined;
        }>>;
        priceBand: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            currency: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
            currency?: string | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
            currency?: string | undefined;
        }>>;
        sources: z.ZodOptional<z.ZodObject<{
            include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
        }, {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
        }>>;
        consent: z.ZodOptional<z.ZodObject<{
            sms: z.ZodOptional<z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>>;
            email: z.ZodOptional<z.ZodEnum<["OPTIONAL", "GRANTED", "NOT_REVOKED"]>>;
        }, "strip", z.ZodTypeAny, {
            sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
            email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        }, {
            sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
            email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        }>>;
        buyerRep: z.ZodOptional<z.ZodEnum<["ANY", "REQUIRED_ACTIVE", "PROHIBIT_ACTIVE"]>>;
        timeWindows: z.ZodOptional<z.ZodArray<z.ZodObject<{
            timezone: z.ZodString;
            start: z.ZodString;
            end: z.ZodString;
            days: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
        }, "strip", z.ZodTypeAny, {
            timezone: string;
            start: string;
            end: string;
            days?: number[] | undefined;
        }, {
            timezone: string;
            start: string;
            end: string;
            days?: number[] | undefined;
        }>, "many">>;
        demographics: z.ZodOptional<z.ZodObject<{
            minAge: z.ZodOptional<z.ZodNumber>;
            maxAge: z.ZodOptional<z.ZodNumber>;
            tags: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            languages: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            ethnicities: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            minAge?: number | undefined;
            maxAge?: number | undefined;
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            ethnicities?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
        }, {
            minAge?: number | undefined;
            maxAge?: number | undefined;
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            ethnicities?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
        }>>;
        customFields: z.ZodOptional<z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            operator: z.ZodEnum<["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "GT", "GTE", "LT", "LTE", "CONTAINS", "NOT_CONTAINS", "EXISTS", "NOT_EXISTS"]>;
            value: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            key: string;
            operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
            value?: any;
        }, {
            key: string;
            operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
            value?: any;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        geography?: {
            includeStates?: string[] | undefined;
            includeCities?: string[] | undefined;
            includePostalCodes?: string[] | undefined;
            excludeStates?: string[] | undefined;
            excludeCities?: string[] | undefined;
            excludePostalCodes?: string[] | undefined;
        } | undefined;
        priceBand?: {
            min?: number | undefined;
            max?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        sources?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
        } | undefined;
        consent?: {
            sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
            email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        } | undefined;
        buyerRep?: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE" | undefined;
        timeWindows?: {
            timezone: string;
            start: string;
            end: string;
            days?: number[] | undefined;
        }[] | undefined;
        demographics?: {
            minAge?: number | undefined;
            maxAge?: number | undefined;
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            ethnicities?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
        } | undefined;
        customFields?: {
            key: string;
            operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
            value?: any;
        }[] | undefined;
    }, {
        geography?: {
            includeStates?: string[] | undefined;
            includeCities?: string[] | undefined;
            includePostalCodes?: string[] | undefined;
            excludeStates?: string[] | undefined;
            excludeCities?: string[] | undefined;
            excludePostalCodes?: string[] | undefined;
        } | undefined;
        priceBand?: {
            min?: number | undefined;
            max?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        sources?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
        } | undefined;
        consent?: {
            sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
            email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        } | undefined;
        buyerRep?: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE" | undefined;
        timeWindows?: {
            timezone: string;
            start: string;
            end: string;
            days?: number[] | undefined;
        }[] | undefined;
        demographics?: {
            minAge?: number | undefined;
            maxAge?: number | undefined;
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            ethnicities?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
        } | undefined;
        customFields?: {
            key: string;
            operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
            value?: any;
        }[] | undefined;
    }>>;
    targets: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"AGENT">;
        id: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        agentFilter: z.ZodOptional<z.ZodObject<{
            tags: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            languages: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            specialties: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            minKeptApptRate: z.ZodOptional<z.ZodNumber>;
            minCapacityRemaining: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        }, {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "AGENT";
        id: string;
        label?: string | undefined;
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
    }, {
        type: "AGENT";
        id: string;
        label?: string | undefined;
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"TEAM">;
        id: z.ZodString;
        strategy: z.ZodDefault<z.ZodEnum<["BEST_FIT", "ROUND_ROBIN"]>>;
        includeRoles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        agentFilter: z.ZodOptional<z.ZodObject<{
            tags: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            languages: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            specialties: z.ZodOptional<z.ZodObject<{
                include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                exclude: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                match: z.ZodOptional<z.ZodEnum<["ANY", "ALL"]>>;
            }, "strip", z.ZodTypeAny, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }, {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            }>>;
            minKeptApptRate: z.ZodOptional<z.ZodNumber>;
            minCapacityRemaining: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        }, {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "TEAM";
        id: string;
        strategy: "BEST_FIT" | "ROUND_ROBIN";
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
        includeRoles?: string[] | undefined;
    }, {
        type: "TEAM";
        id: string;
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
        strategy?: "BEST_FIT" | "ROUND_ROBIN" | undefined;
        includeRoles?: string[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"POND">;
        id: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "POND";
        id: string;
        label?: string | undefined;
    }, {
        type: "POND";
        id: string;
        label?: string | undefined;
    }>]>, "many">;
    fallback: z.ZodOptional<z.ZodObject<{
        teamId: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
        escalationChannels: z.ZodOptional<z.ZodArray<z.ZodEnum<["EMAIL", "SMS", "IN_APP"]>, "many">>;
        relaxAgentFilters: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        teamId: string;
        label?: string | undefined;
        escalationChannels?: ("EMAIL" | "SMS" | "IN_APP")[] | undefined;
        relaxAgentFilters?: boolean | undefined;
    }, {
        teamId: string;
        label?: string | undefined;
        escalationChannels?: ("EMAIL" | "SMS" | "IN_APP")[] | undefined;
        relaxAgentFilters?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    conditions: {
        geography?: {
            includeStates?: string[] | undefined;
            includeCities?: string[] | undefined;
            includePostalCodes?: string[] | undefined;
            excludeStates?: string[] | undefined;
            excludeCities?: string[] | undefined;
            excludePostalCodes?: string[] | undefined;
        } | undefined;
        priceBand?: {
            min?: number | undefined;
            max?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        sources?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
        } | undefined;
        consent?: {
            sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
            email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        } | undefined;
        buyerRep?: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE" | undefined;
        timeWindows?: {
            timezone: string;
            start: string;
            end: string;
            days?: number[] | undefined;
        }[] | undefined;
        demographics?: {
            minAge?: number | undefined;
            maxAge?: number | undefined;
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            ethnicities?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
        } | undefined;
        customFields?: {
            key: string;
            operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
            value?: any;
        }[] | undefined;
    };
    targets: ({
        type: "AGENT";
        id: string;
        label?: string | undefined;
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
    } | {
        type: "TEAM";
        id: string;
        strategy: "BEST_FIT" | "ROUND_ROBIN";
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
        includeRoles?: string[] | undefined;
    } | {
        type: "POND";
        id: string;
        label?: string | undefined;
    })[];
    fallback?: {
        teamId: string;
        label?: string | undefined;
        escalationChannels?: ("EMAIL" | "SMS" | "IN_APP")[] | undefined;
        relaxAgentFilters?: boolean | undefined;
    } | undefined;
}, {
    targets: ({
        type: "AGENT";
        id: string;
        label?: string | undefined;
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
    } | {
        type: "TEAM";
        id: string;
        agentFilter?: {
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            specialties?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            minKeptApptRate?: number | undefined;
            minCapacityRemaining?: number | undefined;
        } | undefined;
        strategy?: "BEST_FIT" | "ROUND_ROBIN" | undefined;
        includeRoles?: string[] | undefined;
    } | {
        type: "POND";
        id: string;
        label?: string | undefined;
    })[];
    conditions?: {
        geography?: {
            includeStates?: string[] | undefined;
            includeCities?: string[] | undefined;
            includePostalCodes?: string[] | undefined;
            excludeStates?: string[] | undefined;
            excludeCities?: string[] | undefined;
            excludePostalCodes?: string[] | undefined;
        } | undefined;
        priceBand?: {
            min?: number | undefined;
            max?: number | undefined;
            currency?: string | undefined;
        } | undefined;
        sources?: {
            include?: string[] | undefined;
            exclude?: string[] | undefined;
        } | undefined;
        consent?: {
            sms?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
            email?: "GRANTED" | "OPTIONAL" | "NOT_REVOKED" | undefined;
        } | undefined;
        buyerRep?: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE" | undefined;
        timeWindows?: {
            timezone: string;
            start: string;
            end: string;
            days?: number[] | undefined;
        }[] | undefined;
        demographics?: {
            minAge?: number | undefined;
            maxAge?: number | undefined;
            tags?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            languages?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
            ethnicities?: {
                include?: string[] | undefined;
                exclude?: string[] | undefined;
                match?: "ANY" | "ALL" | undefined;
            } | undefined;
        } | undefined;
        customFields?: {
            key: string;
            operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GT" | "GTE" | "LT" | "LTE" | "CONTAINS" | "NOT_CONTAINS" | "EXISTS" | "NOT_EXISTS";
            value?: any;
        }[] | undefined;
    } | undefined;
    fallback?: {
        teamId: string;
        label?: string | undefined;
        escalationChannels?: ("EMAIL" | "SMS" | "IN_APP")[] | undefined;
        relaxAgentFilters?: boolean | undefined;
    } | undefined;
}>;
export type LeadRoutingRuleConfig = z.infer<typeof leadRoutingRuleConfigSchema>;
export interface LeadRoutingPersonContext {
    source?: string | null;
    buyerRepStatus?: string | null;
    tags?: string[] | null;
    age?: number | null;
    languages?: string[] | null;
    ethnicities?: string[] | null;
    customFields?: Record<string, unknown> | null;
    consent: {
        sms: LeadRoutingConsentState;
        email: LeadRoutingConsentState;
    };
}
export interface LeadRoutingListingContext {
    price?: number | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
}
export interface LeadRoutingContext {
    now: Date;
    tenantTimezone: string;
    person: LeadRoutingPersonContext;
    listing?: LeadRoutingListingContext;
}
export interface LeadRoutingConditionCheck {
    key: keyof LeadRoutingConditions;
    passed: boolean;
    detail?: string;
}
export interface LeadRoutingEvaluationResult {
    matched: boolean;
    checks: LeadRoutingConditionCheck[];
}
export declare const evaluateLeadRoutingConditions: (conditions: LeadRoutingConditions | null | undefined, context: LeadRoutingContext) => LeadRoutingEvaluationResult;
export declare const routingConfigSchema: z.ZodObject<{
    minimumScore: z.ZodDefault<z.ZodNumber>;
    performanceWeight: z.ZodDefault<z.ZodNumber>;
    capacityWeight: z.ZodDefault<z.ZodNumber>;
    geographyWeight: z.ZodDefault<z.ZodNumber>;
    priceBandWeight: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    minimumScore: number;
    performanceWeight: number;
    capacityWeight: number;
    geographyWeight: number;
    priceBandWeight: number;
}, {
    minimumScore?: number | undefined;
    performanceWeight?: number | undefined;
    capacityWeight?: number | undefined;
    geographyWeight?: number | undefined;
    priceBandWeight?: number | undefined;
}>;
export type RoutingConfig = z.infer<typeof routingConfigSchema>;
export interface AgentSnapshot {
    userId: string;
    fullName: string;
    capacityTarget: number;
    activePipeline: number;
    geographyFit: number;
    priceBandFit: number;
    keptApptRate: number;
    consentReady: boolean;
    tenDlcReady: boolean;
    teamId?: string;
    roundRobinOrder?: number;
}
export interface RoutingInput {
    leadId: string;
    tenantId: string;
    geographyImportance: number;
    priceBandImportance: number;
    agents: AgentSnapshot[];
    config?: RoutingConfig;
    fallbackTeamId?: string;
    quietHours: boolean;
}
export interface AgentScore {
    userId: string;
    fullName: string;
    score: number;
    reasons: {
        type: 'CAPACITY' | 'PERFORMANCE' | 'GEOGRAPHY' | 'PRICE_BAND' | 'CONSENT' | 'TEN_DLC';
        description: string;
        weight: number;
    }[];
}
export interface RoutingResult {
    leadId: string;
    tenantId: string;
    selectedAgents: AgentScore[];
    fallbackTeamId?: string;
    usedFallback: boolean;
    quietHours: boolean;
}
export declare const scoreAgent: (input: AgentSnapshot, config: RoutingConfig) => AgentScore | null;
export declare const routeLead: (payload: RoutingInput) => RoutingResult;
