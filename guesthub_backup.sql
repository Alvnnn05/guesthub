--
-- PostgreSQL database dump
--

\restrict rnr5kCt1A7iowvggvpWjYCaE9ecaTSGIbjHTloOAhXvX3hFoWKfmZJ0I5HJnipX

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

-- Started on 2026-10-12 09:50:09

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 24579)
-- Name: tamu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tamu (
    id integer NOT NULL,
    nama_tamu character varying(150) NOT NULL,
    instansi_asal character varying(150) NOT NULL,
    no_hp character varying(20) NOT NULL,
    tujuan_bidang character varying(100) NOT NULL,
    perihal text NOT NULL,
    foto_url text,
    status character varying(20) DEFAULT 'BERKUNJUNG'::character varying,
    waktu_masuk timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tamu OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 24578)
-- Name: tamu_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tamu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tamu_id_seq OWNER TO postgres;

--
-- TOC entry 4915 (class 0 OID 0)
-- Dependencies: 217
-- Name: tamu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tamu_id_seq OWNED BY public.tamu.id;


--
-- TOC entry 220 (class 1259 OID 24590)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100),
    role character varying(20) DEFAULT 'resepsionis'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24589)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4916 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4747 (class 2604 OID 24582)
-- Name: tamu id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tamu ALTER COLUMN id SET DEFAULT nextval('public.tamu_id_seq'::regclass);


--
-- TOC entry 4750 (class 2604 OID 24593)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4907 (class 0 OID 24579)
-- Dependencies: 218
-- Data for Name: tamu; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tamu (id, nama_tamu, instansi_asal, no_hp, tujuan_bidang, perihal, foto_url, status, waktu_masuk) FROM stdin;
\.


--
-- TOC entry 4909 (class 0 OID 24590)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, role, created_at) FROM stdin;
3	resepsionis1	$2b$10$6JlQbRo8Qbz5Msd1zdd1vu5K4C0zT47FDc5569Zp8pf0CiB0cCOCa	andrian	resepsionis	2026-10-07 12:15:44.478881
4	admin1	$2b$10$eH7QagQOCeI2W9o5TTHGteu5Z2mxR2QEy0FEWqbjwOyJssnYAX7Z.	vin	admin	2026-10-07 12:17:34.891889
\.


--
-- TOC entry 4917 (class 0 OID 0)
-- Dependencies: 217
-- Name: tamu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tamu_id_seq', 7, true);


--
-- TOC entry 4918 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- TOC entry 4754 (class 2606 OID 24588)
-- Name: tamu tamu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tamu
    ADD CONSTRAINT tamu_pkey PRIMARY KEY (id);


--
-- TOC entry 4756 (class 2606 OID 24601)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (username);


--
-- TOC entry 4758 (class 2606 OID 24599)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4760 (class 2606 OID 24603)
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


-- Completed on 2026-10-12 09:50:09

--
-- PostgreSQL database dump complete
--

\unrestrict rnr5kCt1A7iowvggvpWjYCaE9ecaTSGIbjHTloOAhXvX3hFoWKfmZJ0I5HJnipX

