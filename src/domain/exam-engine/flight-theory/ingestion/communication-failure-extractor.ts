export function canCreateCommunicationFailure(evidence:string){return /failure|loss of communication|communication failure/i.test(evidence)&&!/interference alone|attenuation alone/i.test(evidence);}
