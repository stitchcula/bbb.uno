router.get('/test2',function*(next){
    var it=this
    var map=[]//
    for(var i=0;i<map.length;i++){
        if(map[i].code.toString().substr(2,2)=="00"){
            for(var j=1;;j++){
                if(map[i+j].code.toString().substr(4,2)=="00"){
                    map[i+j].local=map[i].local+map[i+j].local
                    for(var k=1;;k++){
                        if(i+j+k+1==map.length) {
                            var begin=new Date().getTime()
                            console.log("begin at "+begin)
                            var db = it.db.collection('test')
                            for(var s=0;s<map.length;s++){
                                yield db.insert(map[s])
                                if(s+1==map.length){
                                    var end=new Date().getTime()
                                    console.log("end at "+end)
                                    console.log("insert "+map.length+" in "+(end-begin)/1000)
                                    return this.body=map
                                }
                            }
                        }
                        map[i+j+k].local=map[i+j].local+map[i+j+k].local
                        if(map[i+j+k+1].code.toString().substr(4,2)=="00") {
                            j=j+k
                            break
                        }
                    }
                }
                if(map[i+j+1].code.toString().substr(2,2)=="00"){
                    i=i+j
                    break
                }
            }
        }
    }
    yield next
})