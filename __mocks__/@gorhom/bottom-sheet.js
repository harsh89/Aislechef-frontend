const React = require('react');
const { View } = require('react-native');

const BottomSheet = React.forwardRef(({ children }, ref) => {
  React.useImperativeHandle(ref, () => ({
    expand: jest.fn(),
    close: jest.fn(),
    collapse: jest.fn(),
    snapToIndex: jest.fn(),
  }));
  return React.createElement(View, null, children);
});
BottomSheet.displayName = 'BottomSheet';

const BottomSheetView = ({ children, ...props }) =>
  React.createElement(View, props, children);

const BottomSheetModalProvider = ({ children }) =>
  React.createElement(View, null, children);

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheetView,
  BottomSheetModalProvider,
};
