import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_colors.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isEn = Localizations.localeOf(context).languageCode == 'en';

    return Scaffold(
      appBar: AppBar(
        title: Text(isEn ? 'About' : '앱 정보'),
        
        
        
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _Card(
            title: isEn ? '🔍 About Find Your Sole' : '🔍 Find Your Sole 소개',
            content: isEn
                ? 'A running shoe recommendation app for beginners and experienced runners alike. Answer a few simple questions and get personalized shoe recommendations.'
                : '초심자부터 경험자까지, 간단한 질문에 답하면 나에게 맞는 러닝화를 추천해드립니다.',
          ),
          _Card(
            title: isEn ? '⚙️ How Recommendations Work' : '⚙️ 추천 로직',
            content: isEn
                ? 'Recommendations are based on a rule-based scoring algorithm that considers foot arch, pronation, terrain, cushion preference, foot width, weekly mileage, budget, and body weight.\n\nAI (Claude Haiku) is used only to generate the explanation of why a shoe suits you — not for the ranking itself. This keeps costs low and results consistent.'
                : '추천 결과는 발 아치, 프로네이션, 지면, 쿠션 선호도, 발볼, 주간 거리, 예산, 체중을 반영한 룰 기반 점수 알고리즘으로 계산됩니다.\n\nAI(Claude Haiku)는 신발이 나에게 맞는 이유를 설명하는 데만 사용되며, 순위 계산에는 사용되지 않습니다.',
          ),
          _Card(
            title: isEn ? '📦 Data & Pricing' : '📦 데이터 및 가격 정보',
            content: isEn
                ? 'The shoe database covers approximately 50 models across road and trail categories, curated with reference to RunRepeat and brand official sites.\n\nPrices shown are approximate ranges for reference only. Please check Naver Shopping or the brand\'s official site for current pricing.'
                : '러닝화 데이터는 RunRepeat 및 브랜드 공식 사이트를 참고해 약 50개 모델을 수동으로 정리한 것입니다.\n\n가격은 참고용 가격대이며, 실제 가격과 다를 수 있습니다. 정확한 가격은 네이버 쇼핑 또는 브랜드 공식 사이트에서 확인하세요.',
          ),
          _Card(
            title: isEn ? '⚠️ Disclaimer' : '⚠️ 면책 조항',
            content: isEn
                ? 'This app is a running shoe selection aid and does not constitute medical advice or diagnosis. If you have foot or joint conditions, please consult a medical professional.'
                : '이 앱은 러닝화 선택을 돕기 위한 참고 도구이며, 의학적 진단이나 처방이 아닙니다. 발이나 관절에 이상이 있으신 분은 전문의와 상담하시기 바랍니다.',
          ),
          _Card(
            title: isEn ? '📬 Feedback' : '📬 피드백',
            content: isEn
                ? 'UAT participation and feedback are welcome. This app is an ongoing side project — features are being added gradually.'
                : 'UAT 참여 및 피드백 환영합니다. 지속적으로 기능을 개선하고 있습니다.',
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Find Your Sole v1.0.0',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final String title;
  final String content;

  const _Card({required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          Text(content,
              style: TextStyle(
                  fontSize: 13, color: context.textColor.withOpacity(0.87), height: 1.6)),
        ],
      ),
    );
  }
}
