// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => 'Find Your Sole';

  @override
  String get tabRecommend => '추천';

  @override
  String get tabMyShoes => '내 신발';

  @override
  String get tabFavorites => '찜';

  @override
  String get tabAbout => '정보';

  @override
  String get favoritesEmpty => '찜한 신발이 없어요';

  @override
  String get modeSelectSubtitle => '러닝 경험이 어느 정도인가요?';

  @override
  String get beginnerTitle => '러닝 초심자';

  @override
  String get beginnerSubtitle => '입문 ~ 1년';

  @override
  String get beginnerDescription => '전문 용어 없이\n쉽게 추천받아요';

  @override
  String get expertTitle => '러닝 경험자';

  @override
  String get expertSubtitle => '1년 이상';

  @override
  String get expertDescription => '발 유형부터 훈련 스타일까지\n정밀하게 추천받아요';

  @override
  String get beginnerModeTitle => '🌱 초심자 모드';

  @override
  String get expertModeTitle => '🏃 경험자 모드';

  @override
  String get sectionFrequency => '러닝 경험';

  @override
  String get sectionTerrain => '주로 어디서 뛰나요?';

  @override
  String get sectionPain => '불편한 부위가 있나요?';

  @override
  String get sectionWideFoot => '발볼이 넓은 편인가요?';

  @override
  String get wideFootYes => '넓은 편이에요';

  @override
  String get wideFootNo => '보통이에요';

  @override
  String sectionBudget(String amount) {
    return '예산 (₩${amount}0,000 이하)';
  }

  @override
  String get sectionWeight => '체중 (선택)';

  @override
  String get weightUnder60 => '60kg 미만';

  @override
  String get weight60to80 => '60~80kg';

  @override
  String get weightOver80 => '80kg 이상';

  @override
  String get btnRecommend => '추천 받기';

  @override
  String get freqJustStarted => '이제 막 시작했어요';

  @override
  String get freqUnder6Months => '6개월 미만';

  @override
  String get freqUnder1Year => '1년 미만';

  @override
  String get terrainRoad => '공원 / 도로';

  @override
  String get terrainTrail => '산 / 흙길';

  @override
  String get painNone => '없음';

  @override
  String get painKnee => '무릎';

  @override
  String get painAnkle => '발목';

  @override
  String get painFascia => '발바닥 (족저근막염 등)';

  @override
  String get painMultiple => '여러 곳이 불편해요';

  @override
  String get sectionArch => '발 아치';

  @override
  String get sectionPronation => '프로네이션';

  @override
  String get sectionMainTerrain => '주 지면';

  @override
  String get sectionUseCase => '용도 (복수 선택)';

  @override
  String get sectionCushion => '쿠션 선호도';

  @override
  String get sectionWidth => '발볼';

  @override
  String sectionWeeklyKm(String km) {
    return '주간 러닝 거리 (${km}km)';
  }

  @override
  String get archNormal => '보통 (normal)';

  @override
  String get archFlat => '평발 (flat)';

  @override
  String get archHigh => '높은 아치 (high)';

  @override
  String get pronationNeutral => '뉴트럴';

  @override
  String get pronationMild => '약한 과내전';

  @override
  String get pronationOver => '과내전';

  @override
  String get terrainRoadShort => '로드';

  @override
  String get terrainTrailShort => '트레일';

  @override
  String get useCaseDaily => '데일리';

  @override
  String get useCaseLong => '장거리';

  @override
  String get useCaseRace => '레이스';

  @override
  String get useCaseBeginner => '입문';

  @override
  String get useCaseRecovery => '회복런';

  @override
  String get useCaseTrail => '트레일';

  @override
  String get cushionLow => '낮음';

  @override
  String get cushionMid => '중간';

  @override
  String get cushionHigh => '높음';

  @override
  String get cushionMax => '최고';

  @override
  String get widthNarrow => '좁음';

  @override
  String get widthNormal => '보통';

  @override
  String get widthWide => '넓음';

  @override
  String get resultsTitle => '추천 결과';

  @override
  String get weight => '무게';

  @override
  String get drop => '드롭';

  @override
  String get cushion => '쿠션';

  @override
  String get width => '발볼';

  @override
  String get naverShopping => '네이버 쇼핑에서 보기';

  @override
  String get explanationError => '설명을 불러오지 못했어요.';

  @override
  String errorRecommend(String error) {
    return '오류가 발생했어요: $error';
  }

  @override
  String get myShoesTitle => '내 신발';

  @override
  String get myShoesEmpty => '신발을 추가해보세요';

  @override
  String get addShoe => '신발 추가';

  @override
  String shoeAdded(String name) {
    return '$name 추가됐어요 👟';
  }

  @override
  String get shoeName => '신발 이름';

  @override
  String get brand => '브랜드';

  @override
  String get kmUpdate => '거리 업데이트';

  @override
  String get delete => '삭제';

  @override
  String get cancel => '취소';

  @override
  String get save => '저장';

  @override
  String get replaceTime => '교체 시기';

  @override
  String get cumulativeKm => '누적 거리 업데이트';

  @override
  String get cumulativeKmLabel => '누적 km';
}
