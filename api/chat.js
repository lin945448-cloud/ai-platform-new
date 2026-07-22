export default async function handler(req, res) {
  // 限制只能用 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: '缺少 Prompt' });

  try {
    // 调用 DeepSeek 官方接口
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 这里的密码藏在 Vercel 的环境变量里，前端绝对看不到！
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: '你是一位拥有10年经验的小红书竞品营销分析专家。请严格基于用户提供的数据，输出专业、客观、不瞎编的深度商业洞察报告。' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.7,
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'DeepSeek API 报错');
    }

    res.status(200).json({ result: data.choices[0].message.content });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'AI 接口请求失败，请检查 Vercel 环境变量配置。' });
  }
}
