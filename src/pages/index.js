// src/pages/index.js
import { useEffect, useState } from "react";
import Head from 'next/head';
import { useSession, signIn, signOut } from "next-auth/react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import RegistrationModal from "../components/RegistrationModal";

const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
        return { day: '?', month: 'N/A', full: 'Chưa có thông tin' };
    }
    const date = new Date(timestamp.toDate());
    const day = date.getDate();
    const month = `Thg ${date.getMonth() + 1}`;
    const full = date.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
    return { day, month, full };
};

export default function Home() {
    const { data: session, status } = useSession();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "events"));
                let eventsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                eventsData.sort((a, b) => (a.eventTime?.toMillis() || Infinity) - (b.eventTime?.toMillis() || Infinity));
                setEvents(eventsData);
            } catch (error) {
                console.error("Firebase Read Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const handleRegisterClick = (event) => {
        if (status !== "authenticated") {
            alert("Vui lòng đăng nhập bằng email sinh viên để thực hiện đăng ký.");
            signIn('google');
            return;
        }
        setSelectedEvent(event);
        setIsRegisterModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsRegisterModalOpen(false);
        setSelectedEvent(null);
    };

    if (loading && status === 'loading') {
        return <div style={{ textAlign: 'center', paddingTop: '5rem', fontSize: '1.5rem' }}>Đang tải...</div>;
    }

    return (
        <div className="container">
            <Head>
                <title>Sự kiện Tốt nghiệp - Đại học Cần Thơ</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <header className="hero-banner">
                <img src="/CTU_Logo.png" alt="Logo Đại học Cần Thơ" className="hero-logo" />
                <h1>Hệ thống Đăng ký Sự kiện Lễ Tốt nghiệp</h1>
                
                <div className="login-status">
                    {status === "loading" && <p>Đang tải...</p>}
                    {status === "unauthenticated" && (
                        <button className="login-btn" onClick={() => signIn('google')}>
                            Đăng nhập với Email Sinh viên
                        </button>
                    )}
                    {status === "authenticated" && (
                        <div>
                            <p>Xin chào, {session.user.name}</p>
                            <button className="logout-btn" onClick={() => signOut()}>
                                Đăng xuất
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="schedule-link-container">
                <a href="/lich-tot-nghiep-toan-truong.png" target="_blank" rel="noopener noreferrer" className="schedule-link-button">
                    📅 Xem Lịch tổ chức Lễ tốt nghiệp (Toàn trường)
                </a>
            </div>

            <main>
                <div className="event-grid-detailed">
                    {events.map((event) => {
                        const eventDate = formatDate(event.eventTime);
                        return (
                            <div key={event.id} className="event-card-detailed">
                                <div className="event-card-image-wrapper">
                                    <img src={event.imageUrl} alt={event.title} className="event-card-image" />
                                    <div className="event-card-date">
                                        <span className="month">{eventDate.month}</span>
                                        <span className="day">{eventDate.day}</span>
                                    </div>
                                </div>
                                <div className="event-info">
                                    <h3>{event.title}</h3>
                                    <div className="info-grid">
                                        <p className="info-item"><strong>🏢 Đơn vị:</strong> {event.organizer || 'Chưa cập nhật'}</p>
                                        <p className="info-item"><strong>📍 Địa điểm:</strong> {event.location || 'Chưa cập nhật'}</p>
                                        <p className="info-item"><strong>🗓️ Thời gian:</strong> {eventDate.full}</p>
                                        <p className="info-item"><strong>🕔 Bắt đầu ĐK:</strong> {formatDate(event.startTime).full}</p>
                                        <p className="info-item"><strong>🕔 Hạn chót ĐK:</strong> {formatDate(event.endTime).full}</p>
                                        <p className="info-item"><strong>📊 Số lượng:</strong> {event.registeredCount || 0} / {event.eligibleCount || 'N/A'}</p>
                                    </div>
                                    {event.notes && <p className="info-item notes"><strong>📝 Ghi chú:</strong> {event.notes}</p>}
                                    <button className="register-btn" onClick={() => handleRegisterClick(event)}>
                                        Đăng ký ngay
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>
            {isRegisterModalOpen && <RegistrationModal event={selectedEvent} onClose={handleCloseModal} />}
        </div>
    );
}
