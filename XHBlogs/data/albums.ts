// 本文件由在线发布台 / 本地控制台自动生成，请勿手动修改
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = [
  {
    "id": "album-1794649258565",
    "title": "联调相册X",
    "description": "稍后删除",
    "cover": "/uploads/2026/11/c52e738db4706ea9.jpg",
    "date": "2026-11-14",
    "photos": [
      {
        "url": "/uploads/2026/11/c52e738db4706ea9.jpg",
        "caption": "图一"
      },
      {
        "url": "/uploads/2026/11/c52e738db4706ea9.jpg",
        "caption": "图二"
      }
    ]
  }
];
