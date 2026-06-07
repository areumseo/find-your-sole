import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_localizations.dart';
import '../../models/shoe.dart';
import '../../services/api_service.dart';
import '../../services/favorites_service.dart';
import '../../theme/app_colors.dart';
import '../portfolio/add_shoe_dialog.dart';

class ResultsScreen extends StatelessWidget {
  final List<Shoe> shoes;
  final Map<String, dynamic> prefs;
  final VoidCallback? onBack;

  const ResultsScreen({super.key, required this.shoes, required this.prefs, this.onBack});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalizations.of(context)!.resultsTitle),
        leading: onBack != null
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: onBack)
            : null,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: shoes.length,
        itemBuilder: (context, index) => _ShoeCard(
          shoe: shoes[index],
          rank: index + 1,
          prefs: prefs,
        ),
      ),
    );
  }
}

class _ShoeCard extends StatefulWidget {
  final Shoe shoe;
  final int rank;
  final Map<String, dynamic> prefs;

  const _ShoeCard({required this.shoe, required this.rank, required this.prefs});

  @override
  State<_ShoeCard> createState() => _ShoeCardState();
}

class _ShoeCardState extends State<_ShoeCard> {
  bool _expanded = false;
  String? _explanation;
  bool _loadingExplanation = false;
  bool _isFavorite = false;

  @override
  void initState() {
    super.initState();
    FavoritesService.isFavorite(widget.shoe.id).then((v) {
      if (mounted) setState(() => _isFavorite = v);
    });
  }

  static const _cushionMap = {
    '낮음': 'Low', '중간': 'Medium', '높음': 'High', '최고': 'Maximum',
  };
  static const _widthMap = {
    '좁음': 'Narrow', '보통': 'Normal', '넓음': 'Wide',
  };
  static const _tagColors = {
    '데일리': Color(0xFF87CEEB),
    '장거리': Color(0xFF9B7FD4),
    '레이스': Color(0xFFFF6B6B),
    '입문': Color(0xFF56C786),
    '회복런': Color(0xFF4ECDC4),
    '트레일': Color(0xFF8B6914),
    '템포': Color(0xFFFF9F43),
    '인터벌': Color(0xFFEE5A24),
  };
  String _priceRange(int price, bool isEn) {
    if (price < 100000) return isEn ? 'Under ₩100,000' : '10만원 미만';
    if (price < 150000) return isEn ? '₩100,000–150,000' : '10~15만원대';
    if (price < 200000) return isEn ? '₩150,000–200,000' : '15~20만원대';
    return isEn ? '₩200,000+' : '20만원 이상';
  }

  static const _tagEnMap = {
    '데일리': 'Daily', '장거리': 'Long Run', '레이스': 'Race',
    '입문': 'Beginner', '회복런': 'Recovery', '트레일': 'Trail',
    '템포': 'Tempo', '인터벌': 'Interval',
  };

  Future<void> _loadExplanation() async {
    if (_explanation != null) return;
    setState(() => _loadingExplanation = true);
    try {
      final shoe = widget.shoe;
      final text = await ApiService.explainShoe(
        shoe: {
          'name': shoe.name,
          'brand': shoe.brand,
          'cushion': shoe.cushion,
          'drop_mm': shoe.dropMm,
          'weight_g': shoe.weightG,
          'width': shoe.width,
          'terrain': shoe.terrain,
          'use_case': shoe.useCase,
          'tags': shoe.tags,
        },
        prefs: widget.prefs,
        locale: Localizations.localeOf(context).languageCode,
      );
      if (mounted) setState(() => _explanation = text);
    } catch (_) {
      if (mounted) setState(() => _explanation = AppLocalizations.of(context)!.explanationError);
    } finally {
      if (mounted) setState(() => _loadingExplanation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final shoe = widget.shoe;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: context.borderColor),
      ),
      color: context.cardBg,
      child: Column(
        children: [
          InkWell(
            onTap: () {
              setState(() => _expanded = !_expanded);
              if (_expanded) _loadExplanation();
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: widget.rank <= 3
                          ? const Color(0xFF4AABDB)
                          : Colors.grey.shade200,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${widget.rank}',
                        style: TextStyle(
                          color: widget.rank <= 3
                              ? Colors.white
                              : context.subtitleColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          shoe.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          shoe.brand,
                          style: TextStyle(
                              color: context.subtitleColor, fontSize: 13),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: shoe.useCase.map((tag) {
                            final color =
                                _tagColors[tag] ?? Colors.grey.shade400;
                            final isEn = Localizations.localeOf(context).languageCode == 'en';
                            final label = isEn ? (_tagEnMap[tag] ?? tag) : tag;
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                label,
                                style: TextStyle(
                                  color: color,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          GestureDetector(
                            onTap: () async {
                              await FavoritesService.toggle(shoe);
                              final v = await FavoritesService.isFavorite(shoe.id);
                              if (mounted) setState(() => _isFavorite = v);
                            },
                            child: Icon(
                              _isFavorite ? Icons.favorite : Icons.favorite_border,
                              color: _isFavorite ? const Color(0xFF4AABDB) : context.subtitleColor,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () => showAddShoeDialog(
                              context,
                              initialName: shoe.name,
                              initialBrand: shoe.brand,
                            ),
                            child: Icon(
                              Icons.add_circle_outline,
                              color: context.subtitleColor,
                              size: 22,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        _priceRange(shoe.price, Localizations.localeOf(context).languageCode == 'en'),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(
                        _expanded
                            ? Icons.keyboard_arrow_up
                            : Icons.keyboard_arrow_down,
                        color: context.subtitleColor,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (_expanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _SpecItem(label: AppLocalizations.of(context)!.weight, value: '${shoe.weightG}g'),
                      _SpecItem(label: AppLocalizations.of(context)!.drop, value: '${shoe.dropMm}mm'),
                      _SpecItem(
                        label: AppLocalizations.of(context)!.cushion,
                        value: Localizations.localeOf(context).languageCode == 'en'
                            ? (_cushionMap[shoe.cushion] ?? shoe.cushion)
                            : shoe.cushion,
                      ),
                      _SpecItem(
                        label: AppLocalizations.of(context)!.width,
                        value: Localizations.localeOf(context).languageCode == 'en'
                            ? (_widthMap[shoe.width] ?? shoe.width)
                            : shoe.width,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_loadingExplanation)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(8),
                        child: CircularProgressIndicator(
                          color: Color(0xFF4AABDB),
                          strokeWidth: 2,
                        ),
                      ),
                    )
                  else if (_explanation != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: context.explanationBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('🤖 ', style: TextStyle(fontSize: 16)),
                          Expanded(
                            child: Text(
                              _explanation!,
                              style: const TextStyle(
                                  fontSize: 13, height: 1.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => launchUrl(Uri.parse(shoe.naverUrl), mode: LaunchMode.externalApplication),
                      icon: const Icon(Icons.shopping_cart_outlined, size: 16),
                      label: Text(AppLocalizations.of(context)!.naverShopping),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF03C75A),
                        side: const BorderSide(color: Color(0xFF03C75A)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SpecItem extends StatelessWidget {
  final String label;
  final String value;

  const _SpecItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(label,
              style: TextStyle(fontSize: 11, color: context.subtitleColor)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
