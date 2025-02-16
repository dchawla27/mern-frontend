export const getLocalStorageItem = (key) => {
    const item = localStorage.getItem(key);
    return item ? item : ''; // Return the value or an empty string if not found
};

export const setItemIntoLocalStorage = (key,val) => {
    const item = localStorage.setItem(key,val);
    return item ? item : ''; // Return the value or an empty string if not found
};


export const clearSession = () => {
    localStorage.clear();
}

export const isSessionDetailsAvailable = () => {
    const accessToken = getLocalStorageItem("access_token")?.trim() || "";
    const feedToken = getLocalStorageItem("feed_token")?.trim() || "";
    const refreshToken = getLocalStorageItem("refresh_token")?.trim() || "";
    return accessToken !== "" && feedToken !== "" && refreshToken !== "";
}