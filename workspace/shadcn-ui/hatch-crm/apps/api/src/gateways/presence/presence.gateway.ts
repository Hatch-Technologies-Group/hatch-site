import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

import { PresenceService } from './presence.service'

@WebSocketGateway({ namespace: '/presence', cors: true })
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(PresenceGateway.name)

  constructor(private readonly presence: PresenceService) {}

  async handleConnection(client: Socket) {
    const { orgId, userId } = client.handshake.query as Record<string, string>
    if (!orgId || !userId) {
      this.logger.warn('Presence connection missing orgId/userId')
      client.disconnect(true)
      return
    }
    client.data.orgId = orgId
    client.data.userId = userId
    client.join(orgId)
    await this.presence.record(orgId, userId, 'dashboard')
    this.broadcastActive(orgId)
  }

  async handleDisconnect(client: Socket) {
    const { orgId, userId } = client.data
    if (orgId && userId) {
      await this.presence.cleanupStale()
      this.broadcastActive(orgId)
    }
  }

  @SubscribeMessage('presence:update')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidUnknownValues: false }))
  async updateLocation(@ConnectedSocket() client: Socket, @MessageBody() data: { location: string }) {
    const { orgId, userId } = client.data
    if (!orgId || !userId || !data?.location) return
    await this.presence.record(orgId, userId, data.location)
    this.broadcastEntity(orgId, data.location)
  }

  @SubscribeMessage('presence:heartbeat')
  async heartbeat(@ConnectedSocket() client: Socket) {
    const { orgId, userId } = client.data
    if (!orgId || !userId) return
    await this.presence.record(orgId, userId, 'heartbeat')
  }

  private async broadcastActive(orgId: string) {
    const summary = await this.presence.activeSummary(orgId)
    this.server.to(orgId).emit('presence:activeSummary', summary)
  }

  private async broadcastEntity(orgId: string, location: string) {
    const viewers = await this.presence.viewers(orgId, location)
    this.server.to(orgId).emit('presence:entity', { location, viewers })
  }
}
