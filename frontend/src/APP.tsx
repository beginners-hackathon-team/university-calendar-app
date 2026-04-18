import {useState} from "react";

    export default function APP(){
    const [count, setCount] = useState(0);

    return (
    <div>
      <h2>カウンター</h2>
      <div>
        {count}
      </div>
      <div>
        <button
          onClick={() => setCount(count + 1)}>
          +1
        </button>
        <button
          onClick={() => setCount(count - 1)}
          >
          -1
        </button>
      </div>
    </div>
  );
}

