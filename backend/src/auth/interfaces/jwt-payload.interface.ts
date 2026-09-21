export interface JwtPayload {
  sub: string;
  email: string;
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
}
