import type {FlightSourceMetadata} from "./flight-source-types";
export function validateFlightSource(s:FlightSourceMetadata){const errors:string[]=[];if(!s.officialUrl.startsWith("https://"))errors.push("OFFICIAL_URL_REQUIRED");if(!s.organization)errors.push("ORGANIZATION_REQUIRED");if(s.localPath&&!s.checksum)errors.push("CHECKSUM_REQUIRED");return {valid:errors.length===0,errors}}
