// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Find Your Sole';

  @override
  String get tabRecommend => 'Recommend';

  @override
  String get tabMyShoes => 'My Shoes';

  @override
  String get tabFavorites => 'Favorites';

  @override
  String get tabAbout => 'About';

  @override
  String get favoritesEmpty => 'No favorites yet';

  @override
  String get modeSelectSubtitle => 'How much running experience do you have?';

  @override
  String get beginnerTitle => 'Beginner';

  @override
  String get beginnerSubtitle => 'Up to 1 year';

  @override
  String get beginnerDescription => 'Get recommendations\nwithout the jargon';

  @override
  String get expertTitle => 'Experienced Runner';

  @override
  String get expertSubtitle => '1+ years';

  @override
  String get expertDescription =>
      'Precise recommendations\nbased on your running profile';

  @override
  String get beginnerModeTitle => '🌱 Beginner Mode';

  @override
  String get expertModeTitle => '🏃 Expert Mode';

  @override
  String get sectionFrequency => 'Running experience';

  @override
  String get sectionTerrain => 'Where do you usually run?';

  @override
  String get sectionPain => 'Any discomfort or pain?';

  @override
  String get sectionWideFoot => 'Do you have wide feet?';

  @override
  String get wideFootYes => 'Yes, wide feet';

  @override
  String get wideFootNo => 'Normal width';

  @override
  String sectionBudget(String amount) {
    return 'Budget (under ₩${amount}0,000)';
  }

  @override
  String get sectionWeight => 'Weight (optional)';

  @override
  String get weightUnder60 => 'Under 60kg';

  @override
  String get weight60to80 => '60–80kg';

  @override
  String get weightOver80 => 'Over 80kg';

  @override
  String get btnRecommend => 'Get Recommendations';

  @override
  String get freqJustStarted => 'Just starting out';

  @override
  String get freqUnder6Months => 'Under 6 months';

  @override
  String get freqUnder1Year => 'Under 1 year';

  @override
  String get terrainRoad => 'Park / Road';

  @override
  String get terrainTrail => 'Trail / Dirt';

  @override
  String get painNone => 'None';

  @override
  String get painKnee => 'Knee';

  @override
  String get painAnkle => 'Ankle';

  @override
  String get painFascia => 'Plantar fascia';

  @override
  String get painMultiple => 'Multiple areas';

  @override
  String get sectionArch => 'Foot arch';

  @override
  String get sectionPronation => 'Pronation';

  @override
  String get sectionMainTerrain => 'Main terrain';

  @override
  String get sectionUseCase => 'Use case (multiple)';

  @override
  String get sectionCushion => 'Cushion preference';

  @override
  String get sectionWidth => 'Foot width';

  @override
  String sectionWeeklyKm(String km) {
    return 'Weekly distance (${km}km)';
  }

  @override
  String get archNormal => 'Normal';

  @override
  String get archFlat => 'Flat';

  @override
  String get archHigh => 'High arch';

  @override
  String get pronationNeutral => 'Neutral';

  @override
  String get pronationMild => 'Mild overpronation';

  @override
  String get pronationOver => 'Overpronation';

  @override
  String get terrainRoadShort => 'Road';

  @override
  String get terrainTrailShort => 'Trail';

  @override
  String get useCaseDaily => 'Daily';

  @override
  String get useCaseLong => 'Long distance';

  @override
  String get useCaseRace => 'Race';

  @override
  String get useCaseBeginner => 'Beginner';

  @override
  String get useCaseRecovery => 'Recovery';

  @override
  String get useCaseTrail => 'Trail';

  @override
  String get cushionLow => 'Low';

  @override
  String get cushionMid => 'Medium';

  @override
  String get cushionHigh => 'High';

  @override
  String get cushionMax => 'Maximum';

  @override
  String get widthNarrow => 'Narrow';

  @override
  String get widthNormal => 'Normal';

  @override
  String get widthWide => 'Wide';

  @override
  String get resultsTitle => 'Results';

  @override
  String get weight => 'Weight';

  @override
  String get drop => 'Drop';

  @override
  String get cushion => 'Cushion';

  @override
  String get width => 'Width';

  @override
  String get naverShopping => 'View on Naver Shopping';

  @override
  String get explanationError => 'Failed to load explanation.';

  @override
  String errorRecommend(String error) {
    return 'An error occurred: $error';
  }

  @override
  String get myShoesTitle => 'My Shoes';

  @override
  String get myShoesEmpty => 'Add your running shoes';

  @override
  String get addShoe => 'Add Shoe';

  @override
  String shoeAdded(String name) {
    return '$name added 👟';
  }

  @override
  String get shoeName => 'Shoe name';

  @override
  String get brand => 'Brand';

  @override
  String get kmUpdate => 'Update distance';

  @override
  String get delete => 'Delete';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get replaceTime => 'Time to replace';

  @override
  String get cumulativeKm => 'Update cumulative distance';

  @override
  String get cumulativeKmLabel => 'Total km';
}
