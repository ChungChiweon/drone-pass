export interface FlightSourceDownloader{download(url:string,targetPath:string):Promise<{mimeType:string;checksum:string;bytes:number}>}
