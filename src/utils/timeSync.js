let globalOffset = 0;
let hasSynced = false;

export const syncServerTime = async () => {
    if (hasSynced) return;
    try {
        const response = await fetch('https://worldtimeapi.org/api/timezone/Africa/Cairo');
        if (response.ok) {
            const data = await response.json();
            const serverTime = new Date(data.datetime).getTime();
            const localTime = new Date().getTime();
            globalOffset = serverTime - localTime;
            hasSynced = true;
        }
    } catch(e) {
        console.warn("WorldTimeAPI network constraint. Enforcing local device bounds.");
    }
};

export const getSyncTime = () => {
    return new Date().getTime() + globalOffset;
};
