import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {

    const [isAdmin, setIsAdmin] = useState(false);
    const [shows, setShows] = useState([]);
    const [favoriteMovies, setFavoriteMovies] = useState([]);

    const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

    const { user } = useUser();
    const { getToken } = useAuth();

    const location = useLocation();
    const navigate = useNavigate();

    // Check whether the logged-in user is an admin
    const fetchIsAdmin = async () => {
        try {
            const { data } = await axios.get('/api/admin/is-admin', {
                headers: {
                    Authorization: `Bearer ${await getToken()}`
                }
            });

            setIsAdmin(data.isAdmin);

            if (!data.isAdmin && location.pathname.startsWith('/admin')) {
                navigate('/');
                toast.error('You are not authorized to access admin dashboard');
            }

        } catch (error) {
            console.error("Admin verification error:", error);

            if (error.response?.status === 403) {
                setIsAdmin(false);

                if (location.pathname.startsWith('/admin')) {
                    navigate('/');
                    toast.error('You are not authorized to access admin dashboard');
                }
            }
        }
    };

    // Fetch all available shows
    const fetchShows = async () => {
        try {
            const { data } = await axios.get('/api/show/all');

            if (data.success) {
                setShows(data.shows);
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.error(error);
        }
    };

    // Fetch favorite movies of the logged-in user
    const fetchFavoriteMovies = async () => {
        try {
            const { data } = await axios.get('/api/user/favorites', {
                headers: {
                    Authorization: `Bearer ${await getToken()}`
                }
            });

            if (data.success) {
                setFavoriteMovies(data.movies);
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            console.error(error);
        }
    };

    // Fetch shows when the application loads
    useEffect(() => {
        fetchShows();
    }, []);

    // Verify admin access whenever the user enters an admin route
    useEffect(() => {
        if (user && location.pathname.startsWith('/admin')) {
            fetchIsAdmin();
        }
    }, [user, location.pathname]);

    // Fetch favorites when the user logs in
    useEffect(() => {
        if (user) {
            fetchFavoriteMovies();
        } else {
            setFavoriteMovies([]);
            setIsAdmin(false);
        }
    }, [user]);

    const value = {
        axios,
        fetchIsAdmin,
        user,
        getToken,
        navigate,
        isAdmin,
        shows,
        favoriteMovies,
        fetchFavoriteMovies,
        image_base_url
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
