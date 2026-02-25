import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AiService } from '../ai/ai.service';
import { GenerateOutfitDto } from '../ai/dto/generate-outfit.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

const WS_CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

@WebSocketGateway({
  namespace: '/outfits',
  cors: { origin: WS_CORS_ORIGIN },
})
export class OutfitsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly socketWindowMs = 60_000;
  private readonly socketLimit = 10;
  private readonly requestTimestampsByUser = new Map<string, number[]>();

  constructor(
    private readonly aiService: AiService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.requestTimestampsByUser.entries()) {
        const filtered = timestamps.filter((timestamp) => now - timestamp <= this.socketWindowMs);
        if (!filtered.length) {
          this.requestTimestampsByUser.delete(key);
          continue;
        }
        this.requestTimestampsByUser.set(key, filtered);
      }
    }, this.socketWindowMs).unref();
  }

  handleConnection(client: Socket) {
    const payload = this.authorizeSocket(client);
    if (!payload) {
      client.emit('error', { message: 'Unauthorized WebSocket connection' });
      client.disconnect(true);
      return;
    }
    client.data.user = payload;
    client.emit('status', { message: 'Connected to GOTHYXAN streaming' });
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data.user as JwtPayload | undefined)?.sub;
    if (userId) {
      this.requestTimestampsByUser.delete(userId);
    }
    client.emit('status', { message: 'Disconnected' });
  }

  @SubscribeMessage('generate')
  async generate(@ConnectedSocket() client: Socket, @MessageBody() payload: GenerateOutfitDto) {
    const user = client.data.user as JwtPayload | undefined;
    if (!user?.sub) {
      client.emit('error', { message: 'Unauthorized' });
      return null;
    }
    if (!this.allowSocketRequest(user.sub)) {
      client.emit('error', { message: 'Too many websocket requests. Please wait 1 minute.' });
      return null;
    }

    const steps = [
      'input-analyzer',
      'context-builder',
      'style-classifier',
      'budget-engine',
      'brand-selector',
      'weather-adapter',
      'outfit-composer',
      'validation-layer',
      'response-formatter',
    ];

    for (const step of steps) {
      client.emit('pipeline', { step, status: 'running' });
    }

    try {
      const outfit = await this.aiService.generateOutfit(payload, { userId: user.sub });
      client.emit('result', outfit);
      return outfit;
    } catch (error) {
      client.emit('error', { message: String(error) });
      throw error;
    }
  }

  private authorizeSocket(client: Socket): JwtPayload | null {
    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret');
    if (!accessSecret) {
      return null;
    }

    const handshakeToken = client.handshake.auth?.token;
    const authHeader = client.handshake.headers?.authorization;
    const tokenFromHeader =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;
    const token =
      (typeof handshakeToken === 'string' ? handshakeToken : null) ??
      tokenFromHeader ??
      null;

    if (!token) {
      return null;
    }

    try {
      return this.jwtService.verify<JwtPayload>(token, { secret: accessSecret });
    } catch {
      return null;
    }
  }

  private allowSocketRequest(userId: string) {
    const now = Date.now();
    const bucket = this.requestTimestampsByUser.get(userId) ?? [];
    const filtered = bucket.filter((timestamp) => now - timestamp <= this.socketWindowMs);
    if (filtered.length >= this.socketLimit) {
      this.requestTimestampsByUser.set(userId, filtered);
      return false;
    }
    filtered.push(now);
    this.requestTimestampsByUser.set(userId, filtered);
    return true;
  }
}
