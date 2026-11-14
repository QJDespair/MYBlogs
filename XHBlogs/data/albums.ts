// 本文件由在线发布台 / 本地控制台自动生成，请勿手动修改
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = [
  {
    "id": "album-1794649403331",
    "title": "封面验证相册",
    "description": "稍后删除",
    "cover": "/uploads/2026/11/744b0f46962f6ede.jpg",
    "date": "2026-11-14",
    "photos": [
      {
        "url": "/uploads/2026/11/744b0f46962f6ede.jpg",
        "caption": "一"
      },
      {
        "url": "/uploads/2026/11/20fab8b28af415f4.jpg",
        "caption": "二"
      }
    ]
  }
];
