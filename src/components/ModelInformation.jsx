/* eslint-disable react/prop-types */
import { ResizableBox } from "react-resizable";
import ModelProperties from "./ModelProperties";

function displayValidity(isValid) {
  if (isValid) {
    if (isValid[0] === false && isValid[1] === false) {
      const modelInformation = isValid[2];

      return <ModelProperties modelProperties={modelInformation} />;
    } else if (isValid[0] === true) {
      return (
        <div className="w-full bg-yellow-700 text-white py-2 px-4 rounded mt-1">
          The model presents warnings: {isValid[2]}
        </div>
      );
    } else {
      return (
        <div className="w-full bg-red-700 text-white py-2 px-4 rounded mt-1">
          {isValid[2]}
        </div>
      );
    }
  }
}

const ModelInformation = ({
  width = 300,
  minWidth = 150,
  maxWidth = 400,
  buttonText = "Validate model",
  onValidateModel,
  isValid,
}) => {
  return (
    <ResizableBox
      width={width}
      height={Infinity}
      axis="x"
      minConstraints={[minWidth, Infinity]}
      maxConstraints={[maxWidth, Infinity]}
      className="bg-neutral-300 text-neutral-900 p-4 resize-handle-left rounded-lg overflow-auto"
      handle={
        <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize" />
      }
      resizeHandles={["w"]}
    >
      <div>
        <button
          className="w-full bg-[#356C99] text-white py-2 px-4 rounded active:bg-[#0D486C] shadow-lg"
          onClick={onValidateModel}
        >
          {buttonText}
        </button>
        {displayValidity(isValid)}
      </div>
    </ResizableBox>
  );
};

export default ModelInformation;
