"use strict";

var g_blackPath=[
    "/cache/global/img/gs.gif"
]

export default async (ctx,next)=> {
    var res=await ctx.redis.get(ctx.ip)
    if(res=="blacklist")
        return ctx.status=500
    for(var v of g_blackPath)
        if(v==ctx.path){
            await ctx.redis.set(ctx.ip,"blacklist")
            await ctx.mongo.db("nuc").collection("nuc_shield").insertOne({ip:ctx.ip,timestamp:new Date().getTime()})
            return ctx.status=500
        }
    await next()
}