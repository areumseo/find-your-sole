import 'package:flutter/material.dart';
import '../../models/shoe.dart';
import 'mode_select.dart';
import 'beginner_form.dart';
import 'expert_form.dart';
import 'results.dart';

enum RecommendStep { modeSelect, beginnerForm, expertForm, results }

class RecommendTab extends StatefulWidget {
  final VoidCallback? onSwipeToFavorites;

  const RecommendTab({super.key, this.onSwipeToFavorites});

  @override
  State<RecommendTab> createState() => _RecommendTabState();
}

class _RecommendTabState extends State<RecommendTab> {
  RecommendStep _step = RecommendStep.modeSelect;
  List<Shoe> _results = [];
  Map<String, dynamic> _prefs = {};

  void _goToResults(List<Shoe> shoes, Map<String, dynamic> prefs) {
    setState(() {
      _results = shoes;
      _prefs = prefs;
      _step = RecommendStep.results;
    });
  }

  void _reset() {
    setState(() => _step = RecommendStep.modeSelect);
  }

  // 오른쪽 스와이프: 결과 → 폼 → 모드선택 단계적으로
  void _onSwipeRight() {
    setState(() {
      switch (_step) {
        case RecommendStep.results:
          _step = _lastForm; // 결과 → 마지막 폼
          break;
        case RecommendStep.beginnerForm:
        case RecommendStep.expertForm:
          _step = RecommendStep.modeSelect; // 폼 → 모드선택
          break;
        case RecommendStep.modeSelect:
          break;
      }
    });
  }

  RecommendStep _lastForm = RecommendStep.beginnerForm;

  int get _stepIndex {
    switch (_step) {
      case RecommendStep.modeSelect: return 0;
      case RecommendStep.beginnerForm: return 1;
      case RecommendStep.expertForm: return 2;
      case RecommendStep.results: return 3;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragEnd: (details) {
        final v = details.primaryVelocity ?? 0;
        // 왼쪽→오른쪽: 뒤로
        if (v > 300 && _step != RecommendStep.modeSelect) {
          _onSwipeRight();
        }
        // 오른쪽→왼쪽: 결과 화면에서 Favorites로
        if (v < -300 && _step == RecommendStep.results) {
          widget.onSwipeToFavorites?.call();
        }
      },
      child: IndexedStack(
        index: _stepIndex,
        children: [
          ModeSelectScreen(
            onBeginnerTap: () => setState(() {
              _lastForm = RecommendStep.beginnerForm;
              _step = RecommendStep.beginnerForm;
            }),
            onExpertTap: () => setState(() {
              _lastForm = RecommendStep.expertForm;
              _step = RecommendStep.expertForm;
            }),
          ),
          BeginnerFormScreen(
            onBack: _reset,
            onResults: _goToResults,
          ),
          ExpertFormScreen(
            onBack: _reset,
            onResults: _goToResults,
          ),
          ResultsScreen(
            shoes: _results,
            prefs: _prefs,
            onBack: () => setState(() => _step = _lastForm),
          ),
        ],
      ),
    );
  }
}
