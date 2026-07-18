# Hostinger VPS 배포 가이드

이 문서는 `inq` 애플리케이션을 Hostinger VPS에 Docker Compose로 배포하고,
VPS에서 이미 실행 중인 Traefik을 통해 DuckDNS 도메인과 HTTPS를 연결하는 절차를
설명한다.

## 현재 배포 대상

| 항목 | 값 |
| --- | --- |
| 도메인 | `ybinq.duckdns.org` |
| VPS IPv4 | `187.127.121.118` |
| VPS IPv6 | `2a02:4780:5e:6e58::1` |
| inq 배포 경로 | `/opt/inq` |
| Traefik Compose 경로 | `/docker/traefik/docker-compose.yml` |
| 외부 공개 포트 | Traefik의 TCP `80`, TCP `443` |

IP가 변경되면 DuckDNS의 A/AAAA 레코드와 이 표를 함께 갱신한다.

## 배포 구조

```text
ybinq.duckdns.org -- A/AAAA --> Hostinger VPS

Internet :80/:443
  --> Traefik (기존 VPS 서비스, host network)
  --> inq Nginx container :80
  --> inq API container :3000
  --> SQLite named volume
```

- Traefik만 VPS의 외부 `80`, `443` 포트를 수신한다.
- Traefik은 Docker provider로 Nginx 컨테이너의 라벨을 감지한다.
- ``Host(`ybinq.duckdns.org`)`` 요청은 Nginx 컨테이너 내부 `80` 포트로 전달된다.
- Traefik의 `letsencrypt` resolver가 인증서를 자동으로 발급하고 갱신한다.
- Nginx의 호스트 포트 `8080`은 VPS 로컬 점검을 위해 `127.0.0.1`에만 바인딩된다.
- API 포트와 SQLite는 외부에 공개되지 않는다.

## 기존 Traefik 전제 조건

이 배포 구성은 `/docker/traefik/docker-compose.yml`의 Traefik이 다음 조건을
충족한다고 가정한다.

| 설정 | 필요한 값 |
| --- | --- |
| 네트워크 | `network_mode: host` |
| Docker provider | 활성화 |
| 자동 노출 | `exposedByDefault=false` |
| HTTP 처리 | HTTPS로 redirect |
| HTTPS entrypoint | `websecure` |
| 인증서 resolver | `letsencrypt` |

Traefik 상태는 VPS에서 확인한다.

```bash
cd /docker/traefik
docker compose ps
docker compose config
```

Traefik 설정의 entrypoint 또는 resolver 이름이 위 표와 다르면 inq 라벨도 실제
이름에 맞춰야 한다.

## 1. 로컬 변경 사항 push

VPS에서 최신 코드를 받을 수 있도록 로컬 저장소의 커밋을 먼저 GitHub에 push한다.

```bash
cd /Users/kim-yongbin/Desktop/projects/inq
git status
git push origin main
```

`.env`는 Git에 포함하지 않는다.

## 2. DNS 확인

외부 DNS에서 도메인이 VPS IP를 반환하는지 확인한다.

```bash
dig +short A ybinq.duckdns.org @1.1.1.1
dig +short A ybinq.duckdns.org @8.8.8.8
dig +short AAAA ybinq.duckdns.org @1.1.1.1
```

현재 예상 결과는 다음과 같다.

```text
A     187.127.121.118
AAAA  2a02:4780:5e:6e58::1
```

AAAA 레코드는 해당 IPv6가 실제 VPS에 할당되어 있고 `80`, `443` 포트로 접근할
수 있을 때만 유지한다. 잘못된 AAAA 레코드는 IPv6를 우선하는 클라이언트의 접속과
HTTPS 인증서 발급을 방해할 수 있다.

## 3. Hostinger 방화벽 확인

hPanel에서 `VPS → 해당 서버 → Security → Firewall`로 이동해 다음 인바운드
규칙을 허용한다.

| 동작 | 프로토콜 | 포트 | 소스 | 용도 |
| --- | --- | ---: | --- | --- |
| Accept | TCP | 실제 SSH 포트 | 가능하면 관리자 IP | 서버 관리 |
| Accept | TCP | 80 | Anywhere | Traefik HTTP 및 ACME challenge |
| Accept | TCP | 443 | Anywhere | Traefik HTTPS |

`3000`, `8080`, SQLite 관련 포트는 외부에 열지 않는다. OS 방화벽을 별도로
사용 중이라면 TCP `80`, `443`을 그 방화벽에서도 허용해야 한다. 새 방화벽을
활성화하기 전에 현재 SSH 포트를 허용해 접속이 끊기지 않게 한다.

- [Hostinger VPS 방화벽 안내](https://support.hostinger.com/en/articles/8172641-how-to-use-a-managed-vps-firewall)

## 4. VPS 접속 및 필수 도구 확인

```bash
ssh root@187.127.121.118
```

Docker, Docker Compose와 Git을 확인한다.

```bash
docker --version
docker compose version
git --version
```

Hostinger의 Ubuntu 24.04 Docker 템플릿에는 Docker Engine과 Compose가 미리
설치되어 있다. Docker가 없다면 운영체제에 맞는 Docker 공식 저장소 설치 절차를
사용한다.

- [Hostinger Docker VPS 템플릿 안내](https://support.hostinger.com/en/articles/8306612-how-to-use-the-docker-vps-template)
- [Docker Engine Ubuntu 설치 안내](https://docs.docker.com/engine/install/ubuntu/)

Git만 없다면 Ubuntu에서 다음과 같이 설치한다.

```bash
apt update
apt install -y git
```

root가 아닌 사용자를 쓰는 경우 Docker 실행 권한이 필요하며, 필요하면 아래의
Docker 명령 앞에 `sudo`를 붙인다.

## 5. 프로젝트 받기

최초 배포라면:

```bash
git clone https://github.com/rladydqls99/inq.git /opt/inq
cd /opt/inq
```

저장소가 비공개라서 clone이 거부되면 GitHub Deploy Key 또는 접근 권한이 있는
SSH 키를 사용한다. 이미 clone되어 있다면 최신 커밋만 받는다.

```bash
cd /opt/inq
git pull --ff-only origin main
```

## 6. 운영 환경변수 작성

```bash
cd /opt/inq
cp .env.example .env
openssl rand -hex 32
nano .env
```

`openssl`이 출력한 값을 `SESSION_SECRET`에 넣고 최소 다음 세 항목을 설정한다.

```dotenv
SESSION_SECRET=여기에_생성된_긴_랜덤값
INITIAL_PIN=사용할_PIN
DOMAIN=ybinq.duckdns.org
```

`DOMAIN`에는 `https://`나 마지막 `/`를 붙이지 않는다. 저장 후 파일 권한을
제한한다.

```bash
chmod 600 /opt/inq/.env
```

- `SESSION_SECRET`과 PIN을 GitHub, 이슈, 채팅, 로그에 노출하지 않는다.
- `INITIAL_PIN`은 SQLite DB가 비어 있는 최초 실행 때만 적용된다.
- DB가 생성된 뒤 `.env`의 `INITIAL_PIN`을 바꿔도 저장된 PIN은 바뀌지 않는다.

## 7. Compose 라벨 렌더링 확인

배포 전에 환경변수가 Traefik 라벨에 올바르게 들어가는지 확인한다.

```bash
cd /opt/inq

docker compose \
  -f deploy/docker-compose.prod.yml \
  config
```

출력의 Nginx 서비스에 다음 값이 있어야 한다.

```text
traefik.enable=true
traefik.http.routers.inq.rule=Host(`ybinq.duckdns.org`)
traefik.http.routers.inq.entrypoints=websecure
traefik.http.routers.inq.tls=true
traefik.http.routers.inq.tls.certresolver=letsencrypt
traefik.http.services.inq.loadbalancer.server.port=80
```

`DOMAIN must be set` 오류가 나면 `/opt/inq/.env`의 `DOMAIN` 값을 확인한다.

## 8. 빌드 및 실행

inq는 운영 Compose 파일 하나만 사용한다. VPS의 공용 Traefik 스택을 이 명령으로
다시 만들거나 중지하지 않는다.

```bash
cd /opt/inq

docker compose \
  -f deploy/docker-compose.prod.yml \
  up -d --build
```

첫 빌드는 이미지 다운로드와 프론트엔드/API 빌드 때문에 시간이 걸릴 수 있다.
API는 시작할 때 Prisma 마이그레이션을 실행한다. Nginx 컨테이너가 생성되면 기존
Traefik이 라벨을 감지해 라우터와 HTTPS 인증서를 구성한다.

## 9. 배포 확인

### inq 컨테이너

```bash
cd /opt/inq

docker compose \
  -f deploy/docker-compose.prod.yml \
  ps
```

`api`, `nginx`가 실행 중이고 `healthy`인지 확인한다.

### Traefik 로그

현재 체크리스트 기준 Traefik 컨테이너 이름은 `traefik-traefik-1`이다.

```bash
docker logs --tail=150 traefik-traefik-1
```

컨테이너 이름이 다르면 먼저 실제 이름을 찾는다.

```bash
docker ps --format '{{.Names}}' | grep -i traefik
```

`inq` 라우터, TLS 또는 인증서 resolver 관련 오류가 없는지 확인한다.

### VPS 로컬 Nginx

```bash
curl -fsS http://127.0.0.1:8080/api/health
```

예상 응답:

```json
{"ok":true}
```

### 외부 HTTPS

```bash
curl -fsS https://ybinq.duckdns.org/api/health
```

예상 응답:

```json
{"ok":true}
```

성공하면 브라우저에서 접속한다.

```text
https://ybinq.duckdns.org
```

## 업데이트 배포

새 커밋을 배포할 때는 최신 코드를 받은 뒤 같은 Compose 명령을 다시 실행한다.

```bash
cd /opt/inq
git pull --ff-only origin main

docker compose \
  -f deploy/docker-compose.prod.yml \
  up -d --build
```

Compose는 변경된 이미지를 교체하고 기존 named volume의 SQLite 데이터를 유지한다.
공용 Traefik 스택은 재시작하지 않는다.

## 로그 및 장애 확인

### Traefik이 404를 반환할 때

실행 중인 Nginx 컨테이너에 라벨이 적용됐는지 확인한다.

```bash
docker inspect "$(docker ps -q --filter 'name=inq.*nginx')" \
  --format '{{json .Config.Labels}}'
```

최소 다음 값이 있어야 한다.

```text
traefik.enable=true
traefik.http.routers.inq.rule=Host(`ybinq.duckdns.org`)
```

라벨이 있는데도 404가 발생하면 Traefik의 Docker provider, `websecure`
entrypoint와 라우터 충돌 여부를 확인한다.

### 인증서 발급 실패

```bash
docker logs --tail=200 traefik-traefik-1
```

다음 순서로 확인한다.

1. A/AAAA 레코드가 실제 VPS IP를 반환하는지 확인한다.
2. Hostinger 및 OS 방화벽에서 TCP `80`, `443`이 열려 있는지 확인한다.
3. Traefik이 실제로 `80`, `443`을 수신 중인지 확인한다.
4. 다른 서비스가 해당 포트를 점유하거나 Traefik과 충돌하지 않는지 확인한다.
5. Traefik 로그에서 ACME HTTP challenge와 `letsencrypt` resolver 오류를 확인한다.

포트 상태는 다음과 같이 확인한다.

```bash
ss -ltnp | grep -E ':(80|443)\b'
```

### API 또는 Nginx 오류

```bash
cd /opt/inq

docker compose \
  -f deploy/docker-compose.prod.yml \
  logs --tail=200 api nginx
```

## 중지 및 데이터 보존

inq 컨테이너만 중지하고 네트워크를 정리하려면:

```bash
cd /opt/inq

docker compose \
  -f deploy/docker-compose.prod.yml \
  down
```

이 명령은 `/docker/traefik`의 공용 Traefik 스택을 중지하지 않는다. 다시 시작할
때는 `up -d`를 실행한다. `inq-sqlite` volume에는 애플리케이션 DB가 보관된다.

다음 명령은 SQLite 데이터를 삭제할 수 있으므로 초기화를 명확히 의도한 경우가
아니면 실행하지 않는다.

```bash
docker compose \
  -f deploy/docker-compose.prod.yml \
  down --volumes
```
