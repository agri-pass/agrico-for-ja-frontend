import Map from '@/components/Map';

export default function Home() {
  return (
    <div className="h-screen w-full">
      <header className="absolute top-0 left-0 right-0 bg-white shadow-md z-[1000] p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              農地管理システム - みやま市
            </h1>
            <p className="text-sm text-gray-600">
              あぐり支援室所有農地の可視化
            </p>
          </div>
          <a
            href="/debug"
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
          >
            マッチングデバッグ
          </a>
        </div>
      </header>
      
      <main className="pt-20 h-full">
        <Map />
      </main>
    </div>
  );
}
