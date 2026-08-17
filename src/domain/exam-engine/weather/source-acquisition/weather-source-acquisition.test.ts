import {describe,expect,it} from "vitest";
import {WeatherSourceRegistry,assessWeatherCurrentness,validateWeatherMime,validateWeatherSource} from ".";
import type {WeatherSourceMetadata} from ".";

const source:WeatherSourceMetadata={sourceId:"amo-metar",canonicalTitle:"METAR guide",issuingOrganization:"항공기상청",authority:"OFFICIAL_AVIATION_WEATHER",sourceType:"WEATHER_CODE_GUIDE",currentnessStatus:"CURRENT",officialPageUrl:"https://amo.kma.go.kr/guide",fileType:"HTML",subjectCoverage:["weather"],weatherTopics:["metar"],containsTables:false,containsDiagrams:false,containsWeatherSymbols:false,containsObservationExamples:true,extractionStatus:"READY_FOR_INGESTION",validationStatus:"OFFICIAL_DOMAIN_VERIFIED",notes:[]};
describe("weather source acquisition",()=>{
 it("accepts an official aviation-weather source",()=>expect(validateWeatherSource(source)).toEqual({valid:true,issues:[]}));
 it("rejects non-official domains",()=>expect(validateWeatherSource({...source,officialPageUrl:"https://example.com"}).issues).toContain("NON_OFFICIAL_DOMAIN"));
 it("classifies currentness deterministically",()=>{expect(assessWeatherCurrentness({publicationDate:"2024-01-01"})).toBe("CURRENT");expect(assessWeatherCurrentness({publicationDate:"2014-01-01"})).toBe("HISTORICAL")});
 it("checks MIME and file signatures",()=>{expect(validateWeatherMime("PDF","application/pdf",new TextEncoder().encode("%PDF-1.7"))).toBe(true);expect(validateWeatherMime("PDF","text/html",new TextEncoder().encode("<html>"))).toBe(false)});
 it("blocks duplicate registry entries",()=>{const registry=new WeatherSourceRegistry();registry.register(source);expect(()=>registry.register(source)).toThrow("DUPLICATE_WEATHER_SOURCE")});
});
