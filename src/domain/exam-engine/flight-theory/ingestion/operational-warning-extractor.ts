export function extractOperationalWarnings(text:string){return text.split(/(?<=[.!?])\s+/).filter(line=>/must not|may not|prohibited|warning|hazard|cannot/i.test(line));}
