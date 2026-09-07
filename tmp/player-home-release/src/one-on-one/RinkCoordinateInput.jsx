import { useEffect, useState } from 'react';
import { coordinateTextForValue, parseCoordinateText } from './rinkCoordinateText.js';

function BufferedCoordinateInput({ value, onCommit, onBlur, ...inputProps }) {
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    setText(current => coordinateTextForValue(current, value));
  }, [value]);

  function change(event) {
    const next = event.target.value;
    setText(next);
    const number = parseCoordinateText(next);
    if (number !== null) onCommit(number);
  }

  function blur(event) {
    setText(String(value));
    onBlur?.(event);
  }

  return <input inputMode="decimal" step="any" {...inputProps} type="number" value={text} onChange={change} onBlur={blur} />;
}

// Change resetKey with the edited actor or timeline moment to discard stale text.
export default function RinkCoordinateInput({ resetKey, ...props }) {
  return <BufferedCoordinateInput key={resetKey} {...props} />;
}
