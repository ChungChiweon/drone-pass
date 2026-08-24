import type {FlightTheoryIngestionResult} from "./flight-ingestion-types";
export function summarizeFlightTheoryIngestion(input:Omit<FlightTheoryIngestionResult,"status">):FlightTheoryIngestionResult{return {...input,status:input.errors.length?"FAILED":input.warnings.length?"COMPLETED_WITH_GAPS":"COMPLETED"}}
