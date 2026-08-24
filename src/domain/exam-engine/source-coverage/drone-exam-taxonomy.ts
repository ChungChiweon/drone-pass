export type DroneExamSubject = "AVIATION_LAW" | "AVIATION_WEATHER" | "FLIGHT_THEORY_OPERATION";

export type DroneExamTaxonomyTopic = {
  id: string;
  subject: DroneExamSubject;
  label: string;
  officiallyVerified: boolean;
  keywords: string[];
};

function topics(subject: DroneExamSubject, values: Array<[string, string, string[]]>): DroneExamTaxonomyTopic[] {
  return values.map(([id, label, keywords]) => ({ id, subject, label, officiallyVerified: false, keywords }));
}

export const DRONE_EXAM_TAXONOMY: DroneExamTaxonomyTopic[] = [
  ...topics("AVIATION_LAW", [
    ["law-system", "항공안전법 체계", ["법규 체계", "항공안전법"]],
    ["device-definition", "초경량비행장치 정의와 분류", ["정의", "분류", "초경량"]],
    ["pilot-certification", "조종자 증명", ["조종자", "증명"]],
    ["device-report", "기체 신고", ["신고", "신고번호"]],
    ["safety-certification", "안전성 인증", ["안전성인증"]],
    ["flight-approval", "비행 승인", ["비행승인"]],
    ["special-flight-approval", "특별비행 승인", ["특별비행"]],
    ["restricted-airspace", "비행 제한·금지구역", ["제한구역", "금지구역"]],
    ["airspace", "공역", ["공역"]],
    ["pilot-compliance", "조종자 준수사항", ["준수사항", "금지행위"]],
    ["incident-reporting", "사고·비정상 상황 보고", ["사고", "보고"]],
    ["insurance-business", "보험 및 사업 관련 규정", ["보험", "사업"]],
    ["aviation-business-act", "항공사업법", ["항공사업법"]],
    ["airport-facilities-act", "공항시설법 관련 내용", ["공항시설법"]],
    ["administrative-sanctions", "행정처분", ["행정처분", "취소", "정지"]],
    ["penalties", "벌칙·과태료", ["벌칙", "과태료"]],
    ["operating-rules", "운영세칙", ["운영세칙"]],
    ["legal-tables", "별표·표·수치 기준", ["별표", "기준", "kg"]],
    ["revision-history", "최신 개정 이력", ["개정", "시행일"]]
  ]),
  ...topics("AVIATION_WEATHER", [
    ["atmosphere", "대기 구조", ["대기"]], ["pressure", "기압", ["기압"]],
    ["temperature", "온도", ["온도"]], ["humidity", "습도", ["습도"]],
    ["density", "밀도", ["밀도"]], ["wind", "바람", ["바람"]],
    ["local-wind", "국지풍", ["국지풍"]], ["cloud", "구름", ["구름"]],
    ["fog", "안개", ["안개"]], ["precipitation", "강수", ["강수"]],
    ["front", "전선", ["전선"]], ["air-mass", "기단", ["기단"]],
    ["pressure-system", "고기압·저기압", ["고기압", "저기압"]], ["typhoon", "태풍", ["태풍"]],
    ["turbulence", "난류", ["난류"]], ["wind-shear", "윈드시어", ["윈드시어"]],
    ["icing", "착빙", ["착빙"]], ["thunderstorm", "뇌우", ["뇌우"]],
    ["visibility", "시정", ["시정"]], ["weather-observation", "기상 관측", ["관측"]],
    ["weather-report", "기상 전문", ["METAR", "TAF", "전문"]],
    ["flight-weather-impact", "비행에 미치는 기상 영향", ["기상 영향"]],
    ["uas-weather-judgment", "무인비행장치 운용 판단", ["운용 판단"]]
  ]),
  ...topics("FLIGHT_THEORY_OPERATION", [
    ["flight-principles", "비행 원리", ["비행 원리"]], ["lift", "양력", ["양력"]],
    ["drag", "항력", ["항력"]], ["thrust", "추력", ["추력"]], ["gravity", "중력", ["중력"]],
    ["newton", "뉴턴 법칙", ["뉴턴"]], ["bernoulli", "베르누이 원리", ["베르누이"]],
    ["angle-of-attack", "받음각", ["받음각"]], ["stall", "실속", ["실속"]],
    ["stability-control", "안정성과 조종성", ["안정성", "조종성"]], ["center-of-gravity", "무게중심", ["무게중심"]],
    ["rotorcraft", "회전익 원리", ["회전익"]], ["multicopter", "멀티콥터 구조", ["멀티콥터"]],
    ["fixed-wing", "고정익 구조", ["고정익"]], ["helicopter", "헬리콥터 구조", ["헬리콥터"]],
    ["controls", "조종 장치", ["조종 장치"]], ["flight-controller", "비행제어장치", ["비행제어"]],
    ["sensors", "센서", ["센서"]], ["gnss", "GPS/GNSS", ["GPS", "GNSS"]], ["imu", "IMU", ["IMU"]],
    ["gyro", "자이로", ["자이로"]], ["accelerometer", "가속도계", ["가속도계"]], ["compass", "나침반", ["나침반"]],
    ["motor", "모터", ["모터"]], ["esc", "ESC", ["ESC"]], ["propeller", "프로펠러", ["프로펠러"]],
    ["battery", "배터리", ["배터리"]], ["lipo-safety", "리튬폴리머 안전", ["리튬폴리머", "LiPo"]],
    ["electricity", "전기 기초", ["전기"]], ["radio", "통신과 주파수", ["주파수", "통신"]],
    ["transmitter", "조종기", ["조종기"]], ["failsafe", "페일세이프", ["페일세이프"]],
    ["preflight", "비행 전 점검", ["비행 전"]], ["inflight", "비행 중 운용", ["비행 중"]],
    ["postflight", "비행 후 점검", ["비행 후"]], ["emergency", "비상 절차", ["비상"]],
    ["human-factors", "인적 요인", ["인적 요인"]], ["crm", "CRM", ["CRM"]],
    ["risk-management", "위험관리", ["위험관리"]], ["accident-prevention", "사고 예방", ["사고 예방"]],
    ["maintenance", "정비", ["정비"]], ["recordkeeping", "기록관리", ["기록관리"]]
  ])
];
