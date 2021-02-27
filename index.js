const {_log, _warn, _err, _setFailed} = require('./src/utils/log');
const _ = require('lodash');
const Fs = require('fs-extra');
const Base64 = require('js-base64');
const {get} = require('axios').default;
const MysClient = require('./src/mys/client');
const MysAppClient = require('./src/mys/appClient');
const WbClient = require('./src/weibo/client');

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

const sleep = (ms = Math.floor((1 + Math.random()) * 5000)) => new Promise(resolve => setTimeout(resolve, ms));

const getWbConfig = () => {
    if (Fs.existsSync('wbconfig.json')) {
        try {
            return Fs.readJsonSync('wbconfig.json');
        } catch (e) {
            _err('wbconfig.json 格式错误', e.toString());
        }
    }
    if (!Base64.isValid(process.env.WB_CONFIG)) return [];
    try {
        return JSON.parse(Base64.decode(process.env.WB_CONFIG));
    } catch (e) {
        _err('WB_CONFIG 配置错误', e.toString());
    }
    return [];
};

(async () => {
    /**
     * mys
     */
    const mysCookies = (process.env.COOKIE || '').split('#').filter(cookie => cookie);
    if (mysCookies.length) {
        _log('\nMYS');
        for (const cookie of mysCookies) {
            const mysClient = new MysClient(cookie);
            const roles = await mysClient.getRoles();
            for (const role of roles) {
                await sleep();
                await mysClient.checkin(role);
            }
        }
    }

    /**
     * mys myb
     */
    const mysAppCookies = (process.env.APPCOOKIE || '').split('#').filter(cookie => cookie);
    const missionAppCookies = (process.env.MISSIONCOOKIE || '').split('#').filter(cookie => cookie);
    if (mysAppCookies.length) {
        _log('\nMYS MYB');
        for (let i = 0; i < mysAppCookies.length; i++) {
            const mysAppClient = new MysAppClient(mysAppCookies[i], missionAppCookies[i]);
            await sleep();
            await mysAppClient.appMybCheckin();
        }
    }

    /**
     * weibo
     */
    const wbconfig = getWbConfig();
    if (wbconfig.length) {
        // 获取礼包列表
        const giftList = await WbClient.getGiftList().catch(e => {
            global.failed = true;
            _err('礼包列表请求失败', e.toString());
            return [];
        });

        for (const [i, {webhook, ...config}] of Object.entries(wbconfig)) {
            await sleep();
            _log(`\nWB[${i}]`);
            if (!config.alc) {
                global.failed = true;
                _err('请查看 README 并更新微博签到配置');
            }

            // 签到
            const wbClient = new WbClient(config);
            if (!(await wbClient.login())) continue;
            await wbClient.checkin();

            // 确定需要领取的礼包
            if (!giftList.length) {
                _log('暂无可领取礼包');
                continue;
            }
            const myGiftBox = await wbClient.getMyGiftBox().catch(e => {
                global.failed = true;
                _err('已领取礼包列表请求失败', e.toString());
            });
            if (!myGiftBox) continue;
            const gift = giftList.find(({id}) => !myGiftBox.includes(id));
            if (!gift) {
                _log('暂无可领取礼包');
                continue;
            }

            // 领取礼包
            const code = await wbClient.getGiftCode(gift);
            if (!code) continue;

            // 发送兑换码
            if (webhook) {
                await get(_.template(webhook)(_.mapValues({...gift, code, index: i}, v => encodeURIComponent(v))))
                    .then(() => _log('Webhook 调用成功'))
                    .catch(e => {
                        global.failed = true;
                        _err('Webhook 调用失败', e.toString());
                    });
            }
        }
    }

    _log();

    if (global.failed) _setFailed();
})();
