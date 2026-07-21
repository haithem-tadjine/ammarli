export type JwtPayloadType = {
  id: string;
  role?: string;
  sessionId: string;
  driverId?: string;
  clientId?: string;
  iat: number;
  exp: number;
};
