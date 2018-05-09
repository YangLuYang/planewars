'use strict'
BigNumber.config({
    MODULO_MODE: 1,
    DECIMAL_PLACES: 4
});

var Record = function (address, point) {
    if(this.verifyAddress(address)){
        this.address = address;
        this.timestamp = Blockchain.transaction.timestamp;
        this.point = point;
    }else if(address !== null || address !=="" || address !== undefined){
        let o = JSON.parse(address);
        this.address = o.address;
        this.timestamp = o.timestamp;
        this.point = o.point;
    }else {

    }

};
Record.prototype = {
    toString: function () {
        return JSON.stringify(this);
    },
    getGreaterRecord: function (record) {
        let point = record.point;
        if(parseInt(point)>parseInt(this.point)){
            this.point = point;
            this.timestamp = Blockchain.transaction.timestamp;
        }
        return this;
    },
    verifyAddress: function (address) {
    // 1-valid, 0-invalid
    let result = Blockchain.verifyAddress(address);
    return result === 0 ? false : true;
}
};

var PlaneWarsContract = function () {
    LocalContractStorage.defineMapProperty(this, "records",{
        stringify: function (obj) {
            return obj.toString();
        },
        parse: function (str) {
            return new Record(str);
        }
    });

    LocalContractStorage.defineProperties(this, {
        worldRecord: {
            stringify: function (obj) {
                return obj.toString();
            },
            parse: function (str) {
                return new Record(str);
            }
        },
        adminAddress: null
    });

};
PlaneWarsContract.prototype = {
    init: function () {
        this.adminAddress = Blockchain.transaction.from;
        this.gameOver(1314);
        this.gameOver(12345);
        return this.getWorldRecord();
    },
    //获取玩家记录
    getRecord: function () {
        const addr = Blockchain.transaction.from;
        let record = this.records.get(addr);
        if(record instanceof Record){
            return record;
        }else {
            throw new Error("尚无挑战记录");
        }
    },
    //获取世界记录
    getWorldRecord: function () {
        let worldRecord = this.worldRecord;
        if(worldRecord instanceof Record){
            return worldRecord;
        }else {
            throw new Error("尚无世界纪录");
        }
    },
    //游戏结束记录分数
    gameOver: function (point) {
        const addr = Blockchain.transaction.from;
        let newRecord = new Record(addr,point);
        //纪录分数需要花费0.0001NAS
        Blockchain.transfer(this.adminAddress, new BigNumber(0.0001));
        Event.Trigger('transfer',{
            Transfer: {
                from: addr,
                to: this.adminAddress,
                value: new BigNumber(0.0001)
            }
        });
        //设置世界记录
        this._setWorldRecord(newRecord);
        //设置个人记录
        this._setRecord(newRecord);
        let oldRecord = this.records.get(addr);
        if(oldRecord instanceof Record){
            //只记录最高的分数
            //旧记录存在
            if(parseInt(point)>parseInt(oldRecord)){
                this.records.set(addr,newRecord);
            }
        }else {
            this.records.set(addr,newRecord);
        }
        return this.records.get(addr);
    },
    //设置玩家记录
    _setRecord: function (record) {
        const addr = Blockchain.transaction.from;
        let oldRecord = this.records.get(addr);
        if(oldRecord instanceof Record){
            //如果存在旧记录
            if(parseInt(record.point)>parseInt(oldRecord.point)){
                this.records.set(addr,record);
            }
        }
        return this.records.get(addr);
    },
    //设置世界记录
    _setWorldRecord: function (record) {
        let worldRecord = this.worldRecord;
        if(worldRecord instanceof Record){
            if(record instanceof Record){
                if(parseInt(record.point)>parseInt(this.worldRecord.point)){
                    this.worldRecord = record
                }
            }else {
                throw new Error("record格式错误")
            }
        }else {
            this.worldRecord = record;
        }
        return this.worldRecord;

    },
    //游戏复活
    revival: function () {
        //默认复活一次花费0.001NAS
        try{
            const addr = Blockchain.transaction.from;
            Blockchain.transfer(this.adminAddress, new BigNumber(0.001));
            Event.Trigger('transfer',{
                Transfer: {
                    from: addr,
                    to: this.adminAddress,
                    value: new BigNumber(0.001)
                }
            });
            return {"payed":true};
        }catch (e){
            return {"payed":false};
        }

    },
    //设置管理员账户地址
    setAdminAddress: function (address) {
        if(Blockchain.transaction.from === this.adminAddress){
            this.adminAddress = address;
        } else {
            throw new Error("Admin only");
        }
    },
    //转账
    transfer: function (value) {
        if(Blockchain.transaction.from === this.adminAddress){
            Blockchain.transfer(this.adminAddress,value);
            Event.Trigger("transfer",{
                Transfer: {
                    to: this.adminAddress,
                    value: value
                }
            })
        }else {
            throw new Error("Admin only");
        }

    }
};

module.exports = PlaneWarsContract;

