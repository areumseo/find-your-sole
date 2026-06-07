import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../../models/shoe.dart';
import '../../services/api_service.dart';
import '../../theme/app_colors.dart';
import 'results.dart';

class BeginnerFormScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final void Function(List<Shoe>, Map<String, dynamic>)? onResults;

  const BeginnerFormScreen({super.key, this.onBack, this.onResults});

  @override
  State<BeginnerFormScreen> createState() => _BeginnerFormScreenState();
}

class _BeginnerFormScreenState extends State<BeginnerFormScreen> {
  int _freqIndex = 0;
  int _terrainIndex = 0;
  Set<int> _painIndices = {0}; // 0 = 없음
  bool _wideFoot = false;
  double _budget = 150000;
  int? _weightKg;
  bool _loading = false;

  Future<void> _search(AppLocalizations l) async {
    final painApiValues = ['없음', '무릎', '발목', '발바닥 (족저근막염 등)', '여러 곳이 불편해요'];
    final freqApiValues = ['이제 막 시작했어요', '6개월 미만', '1년 미만'];
    final terrainApiValues = ['공원 / 도로', '산 / 흙길'];

    // 선택된 부위 중 가장 심각한 것 기준으로 매핑
    final String pain;
    if (_painIndices.contains(0) || _painIndices.isEmpty) {
      pain = '없음';
    } else if (_painIndices.length >= 2) {
      pain = '여러 곳이 불편해요';
    } else {
      pain = painApiValues[_painIndices.first];
    }

    setState(() => _loading = true);
    try {
      final results = await ApiService.recommendBeginner(
        frequency: freqApiValues[_freqIndex],
        terrain: terrainApiValues[_terrainIndex],
        pain: pain,
        wideFoot: _wideFoot,
        budget: _budget.toInt(),
        weightKg: _weightKg,
      );
      if (!mounted) return;
      final prefs = {
        'terrain': _terrainIndex == 0 ? '로드' : '트레일',
        'budget': _budget.toInt(),
      };
      if (widget.onResults != null) {
        widget.onResults!(results, prefs);
      } else {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => ResultsScreen(shoes: results, prefs: prefs),
        ));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l.errorRecommend(e.toString()))),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final frequencies = [l.freqJustStarted, l.freqUnder6Months, l.freqUnder1Year];
    final terrains = [l.terrainRoad, l.terrainTrail];
    final pains = [l.painNone, l.painKnee, l.painAnkle, l.painFascia, l.painMultiple];

    return Scaffold(
      appBar: AppBar(
        title: Text(l.beginnerModeTitle),
        
        
        
        leading: widget.onBack != null
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack)
            : null,
      ),
      
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Section(
              title: l.sectionFrequency,
              child: _ChipGroup(
                options: frequencies,
                selectedIndex: _freqIndex,
                onSelected: (i) => setState(() => _freqIndex = i),
              ),
            ),
            _Section(
              title: l.sectionTerrain,
              child: _ChipGroup(
                options: terrains,
                selectedIndex: _terrainIndex,
                onSelected: (i) => setState(() => _terrainIndex = i),
              ),
            ),
            _Section(
              title: l.sectionPain,
              child: _MultiChipGroup(
                options: pains,
                selectedIndices: _painIndices,
                onSelected: (i) => setState(() {
                  if (i == 0) {
                    // "없음" 선택 시 나머지 해제
                    _painIndices = {0};
                  } else {
                    _painIndices.remove(0); // "없음" 해제
                    if (_painIndices.contains(i)) {
                      _painIndices.remove(i);
                      if (_painIndices.isEmpty) _painIndices = {0};
                    } else {
                      _painIndices.add(i);
                    }
                  }
                }),
              ),
            ),
            _Section(
              title: l.sectionWideFoot,
              child: Row(
                children: [
                  Switch(
                    value: _wideFoot,
                    onChanged: (v) => setState(() => _wideFoot = v),
                    activeColor: const Color(0xFF4AABDB),
                  ),
                  Text(_wideFoot ? l.wideFootYes : l.wideFootNo),
                ],
              ),
            ),
            _Section(
              title: l.sectionWeight,
              child: _ChipGroup(
                options: [l.weightUnder60, l.weight60to80, l.weightOver80],
                selectedIndex: _weightKg == null ? -1 : (_weightKg! < 60 ? 0 : _weightKg! < 80 ? 1 : 2),
                onSelected: (i) => setState(() => _weightKg = i == -1 ? null : [50, 70, 85][i]),
                nullable: true,
              ),
            ),
            _Section(
              title: l.sectionBudget((_budget / 10000).toStringAsFixed(0)),
              child: Slider(
                value: _budget,
                min: 50000,
                max: 400000,
                divisions: 14,
                activeColor: const Color(0xFF4AABDB),
                label: Localizations.localeOf(context).languageCode == 'en'
                    ? '₩${(_budget / 10000).toStringAsFixed(0)}0,000'
                    : '${(_budget / 10000).toStringAsFixed(0)}만원',
                onChanged: (v) => setState(() => _budget = v),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _loading ? null : () => _search(l),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4AABDB),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : Text(l.btnRecommend, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;
  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _MultiChipGroup extends StatelessWidget {
  final List<String> options;
  final Set<int> selectedIndices;
  final ValueChanged<int> onSelected;

  const _MultiChipGroup({
    required this.options,
    required this.selectedIndices,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: List.generate(
        options.length,
        (i) => ChoiceChip(
          label: Text(options[i]),
          selected: selectedIndices.contains(i),
          onSelected: (_) => onSelected(i),
          selectedColor: const Color(0xFF4AABDB),
          labelStyle: TextStyle(
            color: selectedIndices.contains(i) ? Colors.white : context.textColor,
          ),
        ),
      ),
    );
  }
}

class _ChipGroup extends StatelessWidget {
  final List<String> options;
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final bool nullable;

  const _ChipGroup({
    required this.options,
    required this.selectedIndex,
    required this.onSelected,
    this.nullable = false,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: List.generate(
        options.length,
        (i) => ChoiceChip(
          label: Text(options[i]),
          selected: selectedIndex == i,
          onSelected: (_) {
            if (nullable && selectedIndex == i) {
              onSelected(-1);
            } else {
              onSelected(i);
            }
          },
          selectedColor: const Color(0xFF4AABDB),
          labelStyle: TextStyle(
            color: selectedIndex == i ? Colors.white : context.textColor,
          ),
        ),
      ),
    );
  }
}
