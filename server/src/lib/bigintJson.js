// BigInt columns (file sizes) would otherwise make JSON.stringify throw.
BigInt.prototype.toJSON = function () {
    return this.toString();
};
