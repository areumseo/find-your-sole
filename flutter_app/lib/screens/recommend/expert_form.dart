import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../../models/shoe.dart';
import '../../services/api_service.dart';
import 'results.dart';

class ExpertFormScreen extends StatefulWidget {
  final VoidCallback? onBack;
  final void Function(List<Shoe>, Map<String, dynamic>)? onResults;

  const ExpertFormScreen({super.key, this.onBack, this.onResults});

  @override
  State<ExpertFormScreen> createState() => _ExpertFormScreenState();
}

class _ExpertFormScreenState extends State<ExpertFormScreen> {
  String _arch = 'normal';
  String _pronation = 'neutral';
  String _terrain = '로드';
  List<String> _useCase = ['데일리'];
  String _cushion = '중간';
  String _width = '보통';
  double _weeklyKm = 20;
  double _budget = 150000;
  int? _weightKg;
  bool _loading = false;

  Future<void> _search(AppLocalizations l) async {
    setState(() => _loading = true);
    try {
      final results = await ApiService.recommendExpert(
        arch: _arch,
        pronation: _pronation,
        terrain: _terrain,
        useCase: _useCase,
        cushion: _cushion,
        width: _width,
        weeklyKm: _weeklyKm.toInt(),
        budget: _budget.toInt(),
        weightKg: _weightKg,
      );
      if (!mounted) return;
      final prefs = {
        'arch': _arch,
        'pronation': _pronation,
        'terrain': _terrain,
        'cushion': _cushion,
        'width': _width,
        'weekly_km': _weeklyKm.toInt(),
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

    return Scaffold(
      appBar: AppBar(
        title: Text(l.expertModeTitle),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        leading: widget.onBack != null
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: widget.onBack)
            : null,
      ),
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Section(
              title: l.sectionArch,
              child: _ChipGroup(
                options: ['normal', 'flat', 'high'],
                labels: [l.archNormal, l.archFlat, l.archHigh],
                selected: [_arch],
                onSelected: (v) => setState(() => _arch = v),
              ),
            ),
            _Section(
              title: l.sectionPronation,
              child: _ChipGroup(
                options: ['neutral', 'mild_overpronation', 'overpronation'],
                labels: [l.pronationNeutral, l.pronationMild, l.pronationOver],
                selected: [_pronation],
                onSelected: (v) => setState(() => _pronation = v),
              ),
            ),
            _Section(
              title: l.sectionMainTerrain,
              child: _ChipGroup(
                options: ['로드', '트레일'],
                labels: [l.terrainRoadShort, l.terrainTrailShort],
                selected: [_terrain],
                onSelected: (v) => setState(() => _terrain = v),
              ),
            ),
            _Section(
              title: l.sectionUseCase,
              child: _ChipGroup(
                options: ['데일리', '장거리', '레이스', '입문', '회복런', '트레일'],
                labels: [
                  l.useCaseDaily, l.useCaseLong, l.useCaseRace,
                  l.useCaseBeginner, l.useCaseRecovery, l.useCaseTrail
                ],
                selected: _useCase,
                multiSelect: true,
                onSelected: (v) {
                  setState(() {
                    if (_useCase.contains(v)) {
                      if (_useCase.length > 1) _useCase.remove(v);
                    } else {
                      _useCase.add(v);
                    }
                  });
                },
              ),
            ),
            _Section(
              title: l.sectionCushion,
              child: _ChipGroup(
                options: ['낮음', '중간', '높음', '최고'],
                labels: [l.cushionLow, l.cushionMid, l.cushionHigh, l.cushionMax],
                selected: [_cushion],
                onSelected: (v) => setState(() => _cushion = v),
              ),
            ),
            _Section(
              title: l.sectionWidth,
              child: _ChipGroup(
                options: ['좁음', '보통', '넓음'],
                labels: [l.widthNarrow, l.widthNormal, l.widthWide],
                selected: [_width],
                onSelected: (v) => setState(() => _width = v),
              ),
            ),
            _Section(
              title: l.sectionWeeklyKm(_weeklyKm.toInt().toString()),
              child: Slider(
                value: _weeklyKm,
                min: 10,
                max: 80,
                divisions: 7,
                activeColor: const Color(0xFF4AABDB),
                label: '${_weeklyKm.toInt()}km',
                onChanged: (v) => setState(() => _weeklyKm = v),
              ),
            ),
            _Section(
              title: l.sectionWeight,
              child: _ChipGroup(
                options: ['under60', '60to80', 'over80'],
                labels: [l.weightUnder60, l.weight60to80, l.weightOver80],
                selected: _weightKg == null ? [] : [_weightKg! < 60 ? 'under60' : _weightKg! < 80 ? '60to80' : 'over80'],
                onSelected: (v) => setState(() {
                  if (_weightKg != null && ['under60', '60to80', 'over80'].contains(v)) {
                    final cur = _weightKg! < 60 ? 'under60' : _weightKg! < 80 ? '60to80' : 'over80';
                    if (cur == v) { _weightKg = null; return; }
                  }
                  _weightKg = v == 'under60' ? 50 : v == '60to80' ? 70 : 85;
                }),
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

class _ChipGroup extends StatelessWidget {
  final List<String> options;
  final List<String>? labels;
  final List<String> selected;
  final bool multiSelect;
  final ValueChanged<String> onSelected;

  const _ChipGroup({
    required this.options,
    required this.selected,
    required this.onSelected,
    this.labels,
    this.multiSelect = false,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: List.generate(options.length, (i) {
        final value = options[i];
        final label = labels != null ? labels![i] : value;
        final isSelected = selected.contains(value);
        return ChoiceChip(
          label: Text(label),
          selected: isSelected,
          onSelected: (_) => onSelected(value),
          selectedColor: const Color(0xFF4AABDB),
          labelStyle: TextStyle(
            color: isSelected ? Colors.white : Colors.black87,
          ),
        );
      }),
    );
  }
}
