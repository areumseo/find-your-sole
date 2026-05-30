import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../../services/shoes_db_service.dart';
import '../../services/health_service.dart';
import '../../data/shoes_db.dart';

class MyShoesScreen extends StatefulWidget {
  const MyShoesScreen({super.key});

  @override
  State<MyShoesScreen> createState() => _MyShoesScreenState();
}

class _MyShoesScreenState extends State<MyShoesScreen> {
  List<Map<String, dynamic>> _shoes = [];

  @override
  void initState() {
    super.initState();
    _loadShoes();
  }

  Future<void> _loadShoes() async {
    final rows = await ShoesDbService.getAll();
    setState(() => _shoes = rows);
  }

  void _showAddDialog() {
    final nameController = TextEditingController();
    final brandController = TextEditingController();
    DateTime selectedDate = DateTime.now();
    ShoeEntry? selectedShoe;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(AppLocalizations.of(context)!.addShoe,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              Autocomplete<ShoeEntry>(
                optionsBuilder: (textEditingValue) {
                  if (textEditingValue.text.isEmpty) return [];
                  final query = textEditingValue.text.toLowerCase();
                  return kShoesDb.where((s) =>
                      s.name.toLowerCase().contains(query) ||
                      s.brand.toLowerCase().contains(query));
                },
                displayStringForOption: (s) => s.name,
                onSelected: (s) {
                  setModalState(() => selectedShoe = s);
                  nameController.text = s.name;
                  brandController.text = s.brand;
                },
                fieldViewBuilder: (context, controller, focusNode, onSubmit) {
                  if (nameController.text.isNotEmpty &&
                      controller.text != nameController.text) {
                    controller.text = nameController.text;
                  }
                  return TextField(
                    controller: controller,
                    focusNode: focusNode,
                    decoration: InputDecoration(
                      labelText: AppLocalizations.of(context)!.shoeName,
                      border: const OutlineInputBorder(),
                    ),
                    onChanged: (v) => nameController.text = v,
                  );
                },
                optionsViewBuilder: (context, onSelected, options) => Align(
                  alignment: Alignment.topLeft,
                  child: Material(
                    elevation: 4,
                    borderRadius: BorderRadius.circular(12),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 200),
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: options.length,
                        itemBuilder: (context, i) {
                          final s = options.elementAt(i);
                          return ListTile(
                            title: Text(s.name,
                                style: const TextStyle(fontSize: 14)),
                            subtitle: Text(s.brand,
                                style: const TextStyle(fontSize: 12)),
                            onTap: () => onSelected(s),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: brandController,
                decoration: InputDecoration(
                  labelText: AppLocalizations.of(context)!.brand,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    if (nameController.text.isNotEmpty) {
                      await ShoesDbService.addShoe(
                        name: nameController.text,
                        brand: brandController.text.isNotEmpty
                            ? brandController.text
                            : (selectedShoe?.brand ?? ''),
                      );
                      if (context.mounted) Navigator.pop(context);
                      _loadShoes();
                    }
                  },
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF4AABDB),
                  ),
                  child: Text(AppLocalizations.of(context)!.addShoe),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _syncHealth(Map<String, dynamic> shoe) async {
    final granted = await HealthService.requestPermissions();
    if (!granted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('건강 앱 권한이 필요합니다')),
        );
      }
      return;
    }
    final since = DateTime.tryParse(shoe['purchased_at']) ?? DateTime.now().subtract(const Duration(days: 30));
    final km = await HealthService.getRunningKmSince(since);
    await ShoesDbService.updateKm(shoe['id'], km);
    _loadShoes();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${km.toStringAsFixed(1)}km 동기화 완료')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isEn = Localizations.localeOf(context).languageCode == 'en';
    return Scaffold(
      appBar: AppBar(
        title: Text(l.myShoesTitle),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      backgroundColor: const Color(0xFFF8F8F8),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        backgroundColor: const Color(0xFF4AABDB),
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _shoes.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('👟', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 12),
                  Text(l.myShoesEmpty,
                      style: const TextStyle(color: Colors.black45)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _shoes.length,
              itemBuilder: (context, index) {
                final shoe = _shoes[index];
                final km = (shoe['km'] as num).toDouble();
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  color: Colors.white,
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFFFF3EE),
                      child: Text('👟'),
                    ),
                    title: Text(shoe['name'],
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                        '${shoe['brand']} · ${shoe['purchased_at']}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${km.toStringAsFixed(0)}km',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: km > 500
                                    ? Colors.red
                                    : const Color(0xFF4AABDB),
                              ),
                            ),
                            if (km > 500)
                              Text(l.replaceTime,
                                  style: const TextStyle(
                                      fontSize: 10, color: Colors.red)),
                          ],
                        ),
                        PopupMenuButton(
                          itemBuilder: (_) => [
                            PopupMenuItem(
                                value: 'health', child: Text(isEn ? '🏃 Sync with Health' : '🏃 건강 앱 동기화')),
                            PopupMenuItem(
                                value: 'km', child: Text(l.kmUpdate)),
                            PopupMenuItem(
                                value: 'delete', child: Text(l.delete)),
                          ],
                          onSelected: (value) async {
                            if (value == 'delete') {
                              ShoesDbService.deleteShoe(shoe['id'])
                                  .then((_) => _loadShoes());
                            } else if (value == 'km') {
                              _showKmDialog(shoe['id'], km);
                            } else if (value == 'health') {
                              await _syncHealth(shoe);
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  void _showKmDialog(int id, double currentKm) {
    final controller =
        TextEditingController(text: currentKm.toStringAsFixed(0));
    final l = AppLocalizations.of(context)!;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(l.cumulativeKm),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: l.cumulativeKmLabel,
            suffix: const Text('km'),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(l.cancel)),
          FilledButton(
            onPressed: () {
              final km = double.tryParse(controller.text);
              if (km != null) {
                ShoesDbService.updateKm(id, km).then((_) => _loadShoes());
              }
              Navigator.pop(context);
            },
            style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF4AABDB)),
            child: Text(l.save),
          ),
        ],
      ),
    );
  }
}
