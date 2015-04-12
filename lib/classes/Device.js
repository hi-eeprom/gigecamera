var util = require("util");
var events = require("events");
var fs = require("fs");
var GVCP = require("./GVCP").GVCP;

var COMMANDS = require('require-all')({
  dirname : __dirname+'/commands',
  filter  : /([A-Z].+)\.js$/,
});


var Device = function() {
  this._current_ip;
  this.gvcp = new GVCP();
  this.gvcp.client();
  events.EventEmitter.call(this);
}
util.inherits(Device, events.EventEmitter);

Object.defineProperty(Device.prototype, 'ip', {
  get: function() {
    return this._current_ip;
  },
  set: function(ip) {
    this._current_ip = ip;
  }
});

Device.prototype.readPartial = function(address,length,cb,cpos){
  var me = this,rlength = length;
  if (typeof me.tmpData==='undefined'){
    me.tmpData = new Buffer(length);
  }
  if (typeof cpos==='undefined'){
    cpos = 0;
  }

  if (rlength>512){
    rlength=512;
  }
  if (cpos+rlength>length){
    rlength = length-cpos;
  }
  var readXML = new COMMANDS.READMEM.READMEM();
  readXML.read(address+cpos,rlength);
  me.gvcp.send(me._current_ip,readXML,function(err,memmsg){

    memmsg.data.copy(me.tmpData,cpos);
    cpos+=rlength;
    if (cpos===length){
      cb(null,me.tmpData);
      delete me.tmpData;
    }else{
      me.readPartial(address,length,cb,cpos);
    }
  });
}
Device.prototype.getDeviceXML = function(cb){
  var me = this;
  if (typeof me._current_ip==='undefined'){
    throw new Error('you must set an ip-address');
  }

  var readMem = new COMMANDS.READMEM.READMEM();
  readMem.read(0x0200,512);
  me.gvcp.send(me._current_ip,readMem,function(err,memmsg){
    var url = memmsg.data.readString();

    if (url.indexOf('Local:')===0){
      var p = url.split(';');
      var length = parseInt(p[p.length-1],16);
      var address = parseInt(p[p.length-2], 16);
      me.readPartial(address,length,function(err,buffer){
        //console.log(buffer);
        fs.writeFile(p[p.length-3].replace('Local:',''),buffer,function(err){
          if (err){
            console.log(err);
          }
          console.log('written');
        })
      });
      /*
      var readXML = new COMMANDS.READMEM.READMEM();
      readXML.read(address,length);
      console.log(length,address);
      console.log(readXML);
      me.gvcp.send(me._current_ip,readXML,function(err,memmsg){
        console.log('*',memmsg.data);
      });
      */
    }else{
      cb(url+' not supported');
    }
  });

}
exports.Device = Device;