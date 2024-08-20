/* eslint-disable react/prop-types */
import { ResizableBox } from "react-resizable";

const ExecutionOutput = ({
  width = Infinity,
  height = 150,
  axis = "y",
  minConstraints = [Infinity, 100],
  maxConstraints = [Infinity, 300],
  className = "bg-gray-700 text-white p-4 resize-handle-top rounded-lg",
  handleResize,
  children,
}) => {
  return (
    <ResizableBox
      width={width}
      height={height}
      axis={axis}
      minConstraints={minConstraints}
      maxConstraints={maxConstraints}
      className={className}
      handle={
        <div className="absolute top-0 left-0 w-full h-2 cursor-ns-resize" />
      }
      resizeHandles={["n"]}
      onResize={handleResize}
    >
      <div className="overflow-auto h-full">
        <div className="font-semibold text-xl">{children.label}</div>
        <div className="font-mono text-sm">
          {children.result == null ||
          (Array.isArray(children.result) && children.result.length === 0) ? (
            <div>There are no {children.label}.</div>
          ) : Array.isArray(children.result) ? (
            children.result.map((item, index) => (
              <div key={index}>{item.toString()}</div>
            ))
          ) : (
            children.result.toString()
          )}
        </div>
      </div>
    </ResizableBox>
  );
};

export default ExecutionOutput;
