declare module "geoip-lite" {
  export type GeoLookup = { country?: string; region?: string; city?: string; ll?: [number, number] } | null;
  const geoip: { lookup(ip: string): GeoLookup };
  export default geoip;
}
