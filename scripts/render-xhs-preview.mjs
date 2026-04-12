import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {renderXiaohongshuCards} from '../src/render/xiaohongshu-cards.js';

const issues = [
  {
    candidate: {title: 'Mistral 发布 Mistral 3，主打更高性价比的开源级模型能力', source: 'Mistral', newsType: 'model'},
    story: {
      oneLineConclusion: 'Mistral 推出 Mistral 3，强调在推理、速度和部署成本之间取得更均衡的取舍。',
      whyImportant: '模型能力变化会直接影响开发与产品路线。',
      keyFacts: ['继续强化其在企业与开发者场景中的模型竞争力。', '对开发团队来说，这类更新会直接影响模型选型、私有化部署和成本控制。'],
      recommendedVisualType: 'title-card+benchmark'
    }
  },
  {
    candidate: {title: 'Google 将 Notebooks 引入 Gemini，继续打通 NotebookLM 工作流', source: 'Google', newsType: 'product'},
    story: {
      oneLineConclusion: 'Google 宣布在 Gemini 中推出 Notebooks，并与 NotebookLM 能力进一步打通。',
      whyImportant: '这对 AI 办公和知识整理产品非常关键。',
      keyFacts: ['该动态对行业节奏和落地策略有直接参考价值。', '这个变化对 AI 办公和知识整理产品非常关键，因为它不只是单点能力升级。'],
      recommendedVisualType: 'summary-card'
    }
  },
  {
    candidate: {title: 'Anthropic 发布 Managed Agents，进一步强化企业级代理交付路径', source: 'Anthropic', newsType: 'agent'},
    story: {
      oneLineConclusion: 'Anthropic 正在把 agent 从可试验推向可交付。',
      whyImportant: '企业级 agent 的工程化能力开始明确产品化。',
      keyFacts: ['Managed Agents 指向了更完整的托管式代理能力。', '它对团队采用 agent 的门槛、可靠性和部署方式都会产生影响。'],
      recommendedVisualType: 'agent-card'
    }
  },
  {
    candidate: {title: 'Gemini 新增交互式模拟和 3D 图表，扩大可解释展示能力', source: 'Google', newsType: 'product'},
    story: {
      oneLineConclusion: 'Gemini 开始把更可交互的表达方式放进结果展示层。',
      whyImportant: '这会影响教育、搜索和知识产品的呈现体验。',
      keyFacts: ['交互式模拟和 3D 图表会提升结果可理解性。', '这类能力会拉高用户对 AI 展示质量的预期。'],
      recommendedVisualType: 'interactive-card'
    }
  },
  {
    candidate: {title: 'Meta 推出 Muse Spark，强调以人为中心的模型方向', source: 'Meta', newsType: 'model'},
    story: {
      oneLineConclusion: 'Meta 在模型叙事上继续强调以人为中心的体验优先级。',
      whyImportant: '这会影响后续产品包装和模型定位。',
      keyFacts: ['Muse Spark 是其相关方向的重要表达。', '模型定位不仅是技术问题，也会影响产品和生态路线。'],
      recommendedVisualType: 'model-card'
    }
  },
  {
    candidate: {title: 'Axios：OpenAI 正准备面向受信任伙伴的网络安全产品', source: 'Axios / OpenAI', newsType: 'industry'},
    story: {
      oneLineConclusion: 'OpenAI 可能正在推进更强的网络安全产品能力。',
      whyImportant: '这代表模型厂商正向更高门槛场景延伸。',
      keyFacts: ['相关产品据称会先面向受信任伙伴。', '如果落地，会影响企业安全与模型能力结合的竞争格局。'],
      recommendedVisualType: 'security-card'
    }
  }
];

const outDir = path.resolve('output-xhs-2026-04-12-v5');
const images = await renderXiaohongshuCards({issues});
await mkdir(outDir, {recursive: true});

for (const [index, image] of images.entries()) {
  await writeFile(path.join(outDir, `xiaohongshu-card-${String(index + 1).padStart(2, '0')}.png`), image);
}

console.log(outDir);
