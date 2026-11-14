// 本文件由在线发布台 / 本地控制台自动生成，请勿手动修改
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = [
  {
    "id": "album-1794646626393",
    "title": "测试相册",
    "description": "手机上传验证",
    "cover": "/uploads/2026/11/699214d288a7970a.jpg",
    "date": "2026-11-14",
    "photos": [
      {
        "url": "/uploads/2026/11/699214d288a7970a.jpg",
        "caption": "第一张"
      }
    ]
  }
];
