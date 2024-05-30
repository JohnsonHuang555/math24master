type PlayerInfoAreaProps = {
  remainCards?: number;
  score?: number;
};

const PlayerInfoArea = ({ remainCards, score }: PlayerInfoAreaProps) => {
  return (
    <div className="flex basis-1/5 flex-col justify-center p-5">
      <div className="grow">牌庫剩餘: {remainCards || 0}</div>
      <div>得分: {score || 0}</div>
      <div className="text-xl">You</div>
    </div>
  );
};

export default PlayerInfoArea;
