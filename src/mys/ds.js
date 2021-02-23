const md5 = require('md5');
const {generate} = require('randomstring');
const {stringify} = require('qs');



module.exports = {
    ds: () => {
        const salt = 'h8w582wxwgqvahcdkpvdhbh2w9casgfl';
        const t = Math.floor(Date.now() / 1000);
        const r = generate({length: 6, charset: 'abcdefghijklmnopqrstuvwxyz0123456789'});
        const m = md5(stringify({salt, t, r}));
        return [t, r, m].join(',');
    },
    appds: () => {
        const salt = 'tlkyeueq7fej8vtzitt26yl24kswrgm5';
        const t = Math.floor(Date.now() / 1000);
        const r = generate({length: 6, charset: 'abcdefghijklmnopqrstuvwxyz0123456789'});
        const m = md5(stringify({salt, t, r}));
        return [t, r, m].join(',');
    }
};



