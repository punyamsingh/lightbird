// Mock chardet for UI tests — the real module is a dependency of lightbird
const chardet = {
  detect: jest.fn(() => 'UTF-8'),
};
export default chardet;
module.exports = chardet;
