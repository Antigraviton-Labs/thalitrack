const fs = require('fs');

const getMessId = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/messes');
        const data = await res.json();

        if (data.success && data.data.length > 0) {
            const mess = data.data.find(m => m.status === 'open');
            if (mess) {
                fs.writeFileSync('mess_id.txt', mess._id);
                console.log('ID written to mess_id.txt');
            } else {
                console.log('No open mess found');
            }
        }
    } catch (e) {
        console.error(e);
    }
};

getMessId();
