'use client';

type Props = {
  status: 'connected' | 'reconnecting' | 'disconnected';
  onLeave: () => void;
};

export function ReconnectOverlay({ status, onLeave }: Props) {
  if (status === 'connected') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
      {status === 'reconnecting' ? (
        <>
          <div className="mb-6 h-14 w-14 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          <p className="text-xl font-semibold text-white">連線中斷，正在嘗試重新連線...</p>
          <p className="mt-2 text-sm text-white/60">請稍候，勿關閉此頁面</p>
        </>
      ) : (
        <>
          <div className="mb-6 text-6xl">⚠️</div>
          <p className="text-xl font-semibold text-white">已與伺服器斷線</p>
          <p className="mt-2 text-sm text-white/60">無法重新連線，遊戲已結束</p>
          <button
            onClick={onLeave}
            className="mt-8 rounded-lg bg-white px-6 py-2 font-semibold text-black transition hover:bg-white/90"
          >
            回到大廳
          </button>
        </>
      )}
    </div>
  );
}
