type PlayerInfoAreaProps = {
  currentSelect: [];
};

const PlayerInfoArea = ({ currentSelect }: PlayerInfoAreaProps) => {
  return (
    <div className="flex basis-1/5 flex-col justify-center p-5">
      <div className="grow">牌庫剩餘: 30</div>
      <div>得分: 100</div>
      <div className="text-xl">Johnson</div>
    </div>
  );
};

export default PlayerInfoArea;
