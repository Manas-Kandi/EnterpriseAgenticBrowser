import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.openai.com/v1/embeddings', async () => {
    return HttpResponse.json({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
  }),

  http.get('https://api.github.com/search/repositories', async () => {
    return HttpResponse.json({
      total_count: 1,
      items: [
        {
          full_name: 'example/repo',
          stargazers_count: 1,
          forks_count: 1,
          description: 'mock',
          html_url: 'https://github.com/example/repo',
          language: 'TypeScript',
        },
      ],
    });
  }),
];
