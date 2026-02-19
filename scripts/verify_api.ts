const verifyApi = async () => {
    try {
        console.log('Fetching messes from API...');
        const res = await fetch('http://localhost:3000/api/messes');
        const data = await res.json();

        if (!data.success) {
            console.error('API failed:', data.error);
            return;
        }

        const messes = data.data;
        console.log(`Fetched ${messes.length} messes.`);

        let hasError = false;

        messes.forEach((mess: any) => {
            if (mess.status !== 'open') {
                console.error(`FAIL: Mess ${mess.name} is ${mess.status}`);
                hasError = true;
            }
            if (!mess.isApproved) {
                console.error(`FAIL: Mess ${mess.name} is not approved`);
                hasError = true;
            }
            if (!mess.isActive) {
                console.error(`FAIL: Mess ${mess.name} is not active`);
                hasError = true;
            }
            if (!mess.thalis || mess.thalis.length === 0) {
                console.error(`FAIL: Mess ${mess.name} has no thalis`);
                hasError = true;
            }
        });

        if (!hasError) {
            console.log('PASS: All messes meet the criteria.');
        } else {
            console.log('FAIL: Some messes failed criteria.');
        }

    } catch (e) {
        console.error('Verification failed:', e);
    }
};

verifyApi();
