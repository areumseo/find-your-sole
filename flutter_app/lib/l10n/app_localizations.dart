import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ko.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ko'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In ko, this message translates to:
  /// **'Find Your Sole'**
  String get appTitle;

  /// No description provided for @tabRecommend.
  ///
  /// In ko, this message translates to:
  /// **'추천'**
  String get tabRecommend;

  /// No description provided for @tabMyShoes.
  ///
  /// In ko, this message translates to:
  /// **'내 신발'**
  String get tabMyShoes;

  /// No description provided for @tabFavorites.
  ///
  /// In ko, this message translates to:
  /// **'찜'**
  String get tabFavorites;

  /// No description provided for @tabAbout.
  ///
  /// In ko, this message translates to:
  /// **'정보'**
  String get tabAbout;

  /// No description provided for @favoritesEmpty.
  ///
  /// In ko, this message translates to:
  /// **'찜한 신발이 없어요'**
  String get favoritesEmpty;

  /// No description provided for @modeSelectSubtitle.
  ///
  /// In ko, this message translates to:
  /// **'러닝 경험이 어느 정도인가요?'**
  String get modeSelectSubtitle;

  /// No description provided for @beginnerTitle.
  ///
  /// In ko, this message translates to:
  /// **'러닝 초심자'**
  String get beginnerTitle;

  /// No description provided for @beginnerSubtitle.
  ///
  /// In ko, this message translates to:
  /// **'입문 ~ 1년'**
  String get beginnerSubtitle;

  /// No description provided for @beginnerDescription.
  ///
  /// In ko, this message translates to:
  /// **'전문 용어 없이\n쉽게 추천받아요'**
  String get beginnerDescription;

  /// No description provided for @expertTitle.
  ///
  /// In ko, this message translates to:
  /// **'러닝 경험자'**
  String get expertTitle;

  /// No description provided for @expertSubtitle.
  ///
  /// In ko, this message translates to:
  /// **'1년 이상'**
  String get expertSubtitle;

  /// No description provided for @expertDescription.
  ///
  /// In ko, this message translates to:
  /// **'발 유형부터 훈련 스타일까지\n정밀하게 추천받아요'**
  String get expertDescription;

  /// No description provided for @beginnerModeTitle.
  ///
  /// In ko, this message translates to:
  /// **'🌱 초심자 모드'**
  String get beginnerModeTitle;

  /// No description provided for @expertModeTitle.
  ///
  /// In ko, this message translates to:
  /// **'🏃 경험자 모드'**
  String get expertModeTitle;

  /// No description provided for @sectionFrequency.
  ///
  /// In ko, this message translates to:
  /// **'러닝 경험'**
  String get sectionFrequency;

  /// No description provided for @sectionTerrain.
  ///
  /// In ko, this message translates to:
  /// **'주로 어디서 뛰나요?'**
  String get sectionTerrain;

  /// No description provided for @sectionPain.
  ///
  /// In ko, this message translates to:
  /// **'불편한 부위가 있나요? (복수 선택 가능)'**
  String get sectionPain;

  /// No description provided for @sectionWideFoot.
  ///
  /// In ko, this message translates to:
  /// **'발볼이 넓은 편인가요?'**
  String get sectionWideFoot;

  /// No description provided for @wideFootYes.
  ///
  /// In ko, this message translates to:
  /// **'넓은 편이에요'**
  String get wideFootYes;

  /// No description provided for @wideFootNo.
  ///
  /// In ko, this message translates to:
  /// **'보통이에요'**
  String get wideFootNo;

  /// No description provided for @sectionBudget.
  ///
  /// In ko, this message translates to:
  /// **'예산 (₩{amount}0,000 이하)'**
  String sectionBudget(String amount);

  /// No description provided for @sectionWeight.
  ///
  /// In ko, this message translates to:
  /// **'체중 (선택)'**
  String get sectionWeight;

  /// No description provided for @weightUnder60.
  ///
  /// In ko, this message translates to:
  /// **'60kg 미만'**
  String get weightUnder60;

  /// No description provided for @weight60to80.
  ///
  /// In ko, this message translates to:
  /// **'60~80kg'**
  String get weight60to80;

  /// No description provided for @weightOver80.
  ///
  /// In ko, this message translates to:
  /// **'80kg 이상'**
  String get weightOver80;

  /// No description provided for @btnRecommend.
  ///
  /// In ko, this message translates to:
  /// **'추천 받기'**
  String get btnRecommend;

  /// No description provided for @freqJustStarted.
  ///
  /// In ko, this message translates to:
  /// **'이제 막 시작했어요'**
  String get freqJustStarted;

  /// No description provided for @freqUnder6Months.
  ///
  /// In ko, this message translates to:
  /// **'6개월 미만'**
  String get freqUnder6Months;

  /// No description provided for @freqUnder1Year.
  ///
  /// In ko, this message translates to:
  /// **'1년 미만'**
  String get freqUnder1Year;

  /// No description provided for @terrainRoad.
  ///
  /// In ko, this message translates to:
  /// **'공원 / 도로'**
  String get terrainRoad;

  /// No description provided for @terrainTrail.
  ///
  /// In ko, this message translates to:
  /// **'산 / 흙길'**
  String get terrainTrail;

  /// No description provided for @painNone.
  ///
  /// In ko, this message translates to:
  /// **'없음'**
  String get painNone;

  /// No description provided for @painKnee.
  ///
  /// In ko, this message translates to:
  /// **'무릎'**
  String get painKnee;

  /// No description provided for @painAnkle.
  ///
  /// In ko, this message translates to:
  /// **'발목'**
  String get painAnkle;

  /// No description provided for @painFascia.
  ///
  /// In ko, this message translates to:
  /// **'발바닥 (족저근막염 등)'**
  String get painFascia;

  /// No description provided for @painMultiple.
  ///
  /// In ko, this message translates to:
  /// **'여러 곳이 불편해요'**
  String get painMultiple;

  /// No description provided for @sectionArch.
  ///
  /// In ko, this message translates to:
  /// **'발 아치'**
  String get sectionArch;

  /// No description provided for @sectionPronation.
  ///
  /// In ko, this message translates to:
  /// **'프로네이션'**
  String get sectionPronation;

  /// No description provided for @sectionMainTerrain.
  ///
  /// In ko, this message translates to:
  /// **'주 지면'**
  String get sectionMainTerrain;

  /// No description provided for @sectionUseCase.
  ///
  /// In ko, this message translates to:
  /// **'용도 (복수 선택)'**
  String get sectionUseCase;

  /// No description provided for @sectionCushion.
  ///
  /// In ko, this message translates to:
  /// **'쿠션 선호도'**
  String get sectionCushion;

  /// No description provided for @sectionWidth.
  ///
  /// In ko, this message translates to:
  /// **'발볼'**
  String get sectionWidth;

  /// No description provided for @sectionWeeklyKm.
  ///
  /// In ko, this message translates to:
  /// **'주간 러닝 거리 ({km}km)'**
  String sectionWeeklyKm(String km);

  /// No description provided for @archNormal.
  ///
  /// In ko, this message translates to:
  /// **'보통 (normal)'**
  String get archNormal;

  /// No description provided for @archFlat.
  ///
  /// In ko, this message translates to:
  /// **'평발 (flat)'**
  String get archFlat;

  /// No description provided for @archHigh.
  ///
  /// In ko, this message translates to:
  /// **'높은 아치 (high)'**
  String get archHigh;

  /// No description provided for @pronationNeutral.
  ///
  /// In ko, this message translates to:
  /// **'뉴트럴'**
  String get pronationNeutral;

  /// No description provided for @pronationMild.
  ///
  /// In ko, this message translates to:
  /// **'약한 과내전'**
  String get pronationMild;

  /// No description provided for @pronationOver.
  ///
  /// In ko, this message translates to:
  /// **'과내전'**
  String get pronationOver;

  /// No description provided for @terrainRoadShort.
  ///
  /// In ko, this message translates to:
  /// **'로드'**
  String get terrainRoadShort;

  /// No description provided for @terrainTrailShort.
  ///
  /// In ko, this message translates to:
  /// **'트레일'**
  String get terrainTrailShort;

  /// No description provided for @useCaseDaily.
  ///
  /// In ko, this message translates to:
  /// **'데일리'**
  String get useCaseDaily;

  /// No description provided for @useCaseLong.
  ///
  /// In ko, this message translates to:
  /// **'장거리'**
  String get useCaseLong;

  /// No description provided for @useCaseRace.
  ///
  /// In ko, this message translates to:
  /// **'레이스'**
  String get useCaseRace;

  /// No description provided for @useCaseBeginner.
  ///
  /// In ko, this message translates to:
  /// **'입문'**
  String get useCaseBeginner;

  /// No description provided for @useCaseRecovery.
  ///
  /// In ko, this message translates to:
  /// **'회복런'**
  String get useCaseRecovery;

  /// No description provided for @useCaseTrail.
  ///
  /// In ko, this message translates to:
  /// **'트레일'**
  String get useCaseTrail;

  /// No description provided for @cushionLow.
  ///
  /// In ko, this message translates to:
  /// **'낮음'**
  String get cushionLow;

  /// No description provided for @cushionMid.
  ///
  /// In ko, this message translates to:
  /// **'중간'**
  String get cushionMid;

  /// No description provided for @cushionHigh.
  ///
  /// In ko, this message translates to:
  /// **'높음'**
  String get cushionHigh;

  /// No description provided for @cushionMax.
  ///
  /// In ko, this message translates to:
  /// **'최고'**
  String get cushionMax;

  /// No description provided for @widthNarrow.
  ///
  /// In ko, this message translates to:
  /// **'좁음'**
  String get widthNarrow;

  /// No description provided for @widthNormal.
  ///
  /// In ko, this message translates to:
  /// **'보통'**
  String get widthNormal;

  /// No description provided for @widthWide.
  ///
  /// In ko, this message translates to:
  /// **'넓음'**
  String get widthWide;

  /// No description provided for @resultsTitle.
  ///
  /// In ko, this message translates to:
  /// **'추천 결과'**
  String get resultsTitle;

  /// No description provided for @weight.
  ///
  /// In ko, this message translates to:
  /// **'무게'**
  String get weight;

  /// No description provided for @drop.
  ///
  /// In ko, this message translates to:
  /// **'드롭'**
  String get drop;

  /// No description provided for @cushion.
  ///
  /// In ko, this message translates to:
  /// **'쿠션'**
  String get cushion;

  /// No description provided for @width.
  ///
  /// In ko, this message translates to:
  /// **'발볼'**
  String get width;

  /// No description provided for @naverShopping.
  ///
  /// In ko, this message translates to:
  /// **'네이버 쇼핑에서 보기'**
  String get naverShopping;

  /// No description provided for @explanationError.
  ///
  /// In ko, this message translates to:
  /// **'설명을 불러오지 못했어요.'**
  String get explanationError;

  /// No description provided for @errorRecommend.
  ///
  /// In ko, this message translates to:
  /// **'오류가 발생했어요: {error}'**
  String errorRecommend(String error);

  /// No description provided for @myShoesTitle.
  ///
  /// In ko, this message translates to:
  /// **'내 신발'**
  String get myShoesTitle;

  /// No description provided for @myShoesEmpty.
  ///
  /// In ko, this message translates to:
  /// **'신발을 추가해보세요'**
  String get myShoesEmpty;

  /// No description provided for @addShoe.
  ///
  /// In ko, this message translates to:
  /// **'신발 추가'**
  String get addShoe;

  /// No description provided for @shoeAdded.
  ///
  /// In ko, this message translates to:
  /// **'{name} 추가됐어요 👟'**
  String shoeAdded(String name);

  /// No description provided for @shoeName.
  ///
  /// In ko, this message translates to:
  /// **'신발 이름'**
  String get shoeName;

  /// No description provided for @brand.
  ///
  /// In ko, this message translates to:
  /// **'브랜드'**
  String get brand;

  /// No description provided for @kmUpdate.
  ///
  /// In ko, this message translates to:
  /// **'거리 업데이트'**
  String get kmUpdate;

  /// No description provided for @delete.
  ///
  /// In ko, this message translates to:
  /// **'삭제'**
  String get delete;

  /// No description provided for @cancel.
  ///
  /// In ko, this message translates to:
  /// **'취소'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In ko, this message translates to:
  /// **'저장'**
  String get save;

  /// No description provided for @replaceTime.
  ///
  /// In ko, this message translates to:
  /// **'교체 시기'**
  String get replaceTime;

  /// No description provided for @cumulativeKm.
  ///
  /// In ko, this message translates to:
  /// **'누적 거리 업데이트'**
  String get cumulativeKm;

  /// No description provided for @cumulativeKmLabel.
  ///
  /// In ko, this message translates to:
  /// **'누적 km'**
  String get cumulativeKmLabel;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ko'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ko':
      return AppLocalizationsKo();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
