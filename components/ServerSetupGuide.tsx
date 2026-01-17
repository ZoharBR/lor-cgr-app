import React from 'react';

const ServerSetupGuide: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300">
      {/* Toolbar for Actions */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center print:hidden">
        <h1 className="text-xl font-bold text-white">Documentação Técnica de Implantação</h1>
        <button 
          onClick={handlePrint}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors"
        >
          <i className="fas fa-file-pdf"></i> Salvar como PDF / Imprimir
        </button>
      </div>

      {/* Document Content - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
        <div className="max-w-4xl mx-auto bg-white text-slate-900 p-10 rounded-lg shadow-2xl print:shadow-none print:w-full">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-tight">Manual de Implantação</h1>
              <p className="text-xl text-slate-600 mt-2">LOR CGR - Network Operations Center</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Data: {new Date().toLocaleDateString()}</p>
              <p>Versão do Doc: 1.0</p>
              <p>Autor: LOR AI Analyst</p>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="bg-slate-100 p-6 rounded-lg mb-8 border border-slate-200">
            <h2 className="font-bold text-lg mb-4 uppercase text-slate-700">Índice</h2>
            <ol className="list-decimal list-inside space-y-1 text-slate-800 font-medium">
              <li>Criação da Máquina Virtual (VMware ESXi 6.5)</li>
              <li>Instalação do Sistema Operacional (Ubuntu Server 22.04 LTS)</li>
              <li>Configuração de Rede e Acesso (Netplan & SSH)</li>
              <li>Instalação de Dependências e Ambiente (Node.js, PM2, Nginx)</li>
              <li>Configuração do Banco de Dados (PostgreSQL)</li>
              <li>Instalação e Build da Aplicação LOR CGR</li>
            </ol>
          </div>

          {/* SECTION 1 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded text-sm">1</span>
              Criação da Máquina Virtual
            </h2>
            <p className="mb-4 text-justify">
              Este procedimento descreve a criação da VM no ambiente <strong>VMware ESXi 6.5</strong> via Web Client.
            </p>
            
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 border-l-4 border-blue-600">
                <h3 className="font-bold text-blue-900 mb-2">1.1. Especificações de Hardware</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><strong>Nome da VM:</strong> LOR-CGR-SRV-01</li>
                  <li><strong>Compatibilidade:</strong> ESXi 6.5 virtual machine</li>
                  <li><strong>Família do SO:</strong> Linux</li>
                  <li><strong>Versão do SO:</strong> Ubuntu Linux (64-bit)</li>
                  <li><strong>CPU:</strong> 12 vCPUs</li>
                  <li><strong>Memória RAM:</strong> 16 GB (Reservar toda a memória recomendada)</li>
                  <li><strong>Disco Rígido:</strong> 500 GB (Provisionamento: Thin Provision)</li>
                  <li><strong>Adaptador de Rede:</strong> VMXNET 3 (Conectado à VLAN de Servidores)</li>
                  <li><strong>Unidade de CD/DVD:</strong> Datastore ISO file (Selecionar ubuntu-22.04.4-live-server-amd64.iso)</li>
                </ul>
              </div>
              
              <div className="text-sm text-slate-700">
                <p><strong>Passo a Passo no ESXi:</strong></p>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Acesse o painel web do ESXi e clique em <strong>Virtual Machines</strong>.</li>
                  <li>Clique em <strong>Create / Register VM</strong>.</li>
                  <li>Selecione "Create a new virtual machine".</li>
                  <li>Preencha o nome e selecione a compatibilidade conforme acima.</li>
                  <li>Em "Customize settings", ajuste CPU, RAM e Disco conforme especificado.</li>
                  <li>Expanda as opções de CPU e marque "Hardware virtualization" se disponível.</li>
                  <li>Finalize o assistente e inicie a VM (Power On).</li>
                </ol>
              </div>
            </div>
          </section>

          {/* SECTION 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded text-sm">2</span>
              Instalação do SO (Ubuntu 22.04)
            </h2>
            <p className="mb-4 text-justify">
              Siga as instruções do instalador "Subiquity" do Ubuntu Server.
            </p>

            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-800">
              <li><strong>Language:</strong> English (Recomendado para logs) ou Português.</li>
              <li><strong>Keyboard Layout:</strong> Portuguese (Brazil) - Variant: Portuguese (Brazil).</li>
              <li><strong>Network Connections:</strong> Selecione "Edit IPv4" na interface <code>ens160</code> (ou similar) e configure para <strong>Manual</strong>:
                <ul className="list-disc pl-5 mt-1 text-slate-600">
                  <li>Subnet: <code>45.71.242.128/28</code></li>
                  <li>Address: <code>45.71.242.131</code></li>
                  <li>Gateway: <code>45.71.242.129</code></li>
                  <li>Name servers: <code>45.71.242.140, 8.8.8.8</code></li>
                </ul>
              </li>
              <li><strong>Proxy:</strong> Deixe em branco (salvo se houver proxy corporativo).</li>
              <li><strong>Mirror Address:</strong> Padrão do Ubuntu.</li>
              <li><strong>Storage Configuration:</strong> Marque "Use an entire disk" e certifique-se de que "Set up this disk as an LVM group" esteja marcado (permite expansão futura).</li>
              <li><strong>Profile Setup:</strong>
                <ul className="list-disc pl-5 mt-1 text-slate-600">
                  <li>Your name: <code>Leonardo Costa</code></li>
                  <li>Your server's name: <code>lor-cgr-srv</code></li>
                  <li>Pick a username: <code>loradmin</code></li>
                  <li>Choose a password: <code>DefinaUmaSenhaForte</code></li>
                </ul>
              </li>
              <li><strong>SSH Setup:</strong> <span className="text-red-600 font-bold">IMPORTANTE:</span> Marque "Install OpenSSH server".</li>
              <li><strong>Featured Server Snaps:</strong> Não selecione nada neste momento.</li>
              <li>Aguarde a instalação e selecione "Reboot Now". Remova a ISO se necessário.</li>
            </ul>
          </section>

          {/* SECTION 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded text-sm">3</span>
              Pós-Instalação e Dependências
            </h2>
            <p className="mb-4 text-sm">
              Faça login via SSH (ex: <code>ssh loradmin@45.71.242.131</code>) para executar os comandos abaixo.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-2">3.1. Atualização do Sistema</h3>
                <pre className="bg-slate-800 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto print:bg-slate-100 print:text-black print:border print:border-slate-300">
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop net-tools build-essential libssl-dev snmp snmp-mibs-downloader</pre>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-2">3.2. Configuração de Timezone e NTP</h3>
                <pre className="bg-slate-800 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto print:bg-slate-100 print:text-black print:border print:border-slate-300">
# Definir fuso horário
sudo timedatectl set-timezone America/Sao_Paulo

# Instalar NTP Daemon
sudo apt install -y ntp

# Configurar servidores ntp.br
sudo bash -c 'cat > /etc/ntp.conf &lt;&lt;EOF
driftfile /var/lib/ntp/ntp.drift
pool a.st1.ntp.br iburst
pool b.st1.ntp.br iburst
pool c.st1.ntp.br iburst
pool d.st1.ntp.br iburst
restrict -4 default kod notrap nomodify nopeer noquery limited
restrict -6 default kod notrap nomodify nopeer noquery limited
restrict 127.0.0.1
restrict ::1
EOF'

sudo systemctl restart ntp
sudo systemctl enable ntp</pre>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-2">3.3. Instalação do Node.js (v20 LTS)</h3>
                <pre className="bg-slate-800 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto print:bg-slate-100 print:text-black print:border print:border-slate-300">
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js e NPM
sudo apt install -y nodejs

# Verificar versões
node -v
npm -v

# Instalar Yarn e PM2 (Gerenciador de Processos)
sudo npm install -g yarn pm2</pre>
              </div>
            </div>
          </section>

          {/* SECTION 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded text-sm">4</span>
              Banco de Dados (PostgreSQL)
            </h2>
            
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">4.1. Instalação e Configuração</h3>
              <pre className="bg-slate-800 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto print:bg-slate-100 print:text-black print:border print:border-slate-300">
# Instalar Postgres
sudo apt install -y postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar Banco e Usuário
sudo -u postgres psql -c "CREATE DATABASE lorcgr;"
sudo -u postgres psql -c "CREATE USER loradmin WITH ENCRYPTED PASSWORD 'Lor#Vision#2016';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE lorcgr TO loradmin;"

# (Opcional) Permitir acesso externo se for gerenciar via pgAdmin
# Edite /etc/postgresql/14/main/postgresql.conf -> listen_addresses = '*'
# Edite /etc/postgresql/14/main/pg_hba.conf -> host all all 0.0.0.0/0 md5</pre>
            </div>
          </section>

          {/* SECTION 5 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded text-sm">5</span>
              Implantação da Aplicação
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-2">5.1. Setup do Projeto</h3>
                <pre className="bg-slate-800 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto print:bg-slate-100 print:text-black print:border print:border-slate-300">
# Criar diretório da aplicação
sudo mkdir -p /opt/lorcgr
sudo chown -R loradmin:loradmin /opt/lorcgr
cd /opt/lorcgr

# Clonar Repositório (Exemplo)
git clone https://github.com/seu-repo/lor-cgr-app.git .

# Instalar dependências do Frontend
npm install

# Build da Aplicação (Gera pasta 'dist' ou 'build')
npm run build</pre>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-2">5.2. Configuração do Web Server (Nginx)</h3>
                <p className="text-sm mb-2">O Nginx servirá o frontend e fará proxy reverso para o backend se necessário.</p>
                <pre className="bg-slate-800 text-green-400 p-4 rounded text-xs font-mono overflow-x-auto print:bg-slate-100 print:text-black print:border print:border-slate-300">
# Instalar Nginx
sudo apt install -y nginx

# Criar configuração do site
sudo bash -c 'cat &gt; /etc/nginx/sites-available/lorcgr &lt;&lt;EOF
server &#123;
    listen 80;
    server_name 45.71.242.131;

    root /opt/lorcgr/dist;
    index index.html;

    location / &#123;
        try_files \$uri \$uri/ /index.html;
    &#125;

    # Proxy para API (Exemplo se houver backend Node rodando na 3000)
    location /api/ &#123;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    &#125;
&#125;
EOF'

# Ativar site e reiniciar Nginx
sudo ln -s /etc/nginx/sites-available/lorcgr /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx</pre>
              </div>
            </div>
          </section>

          {/* SECTION 6 */}
           <section className="mb-10 page-break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded text-sm">6</span>
              Extras e Monitoramento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 rounded border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-2">Webmin (Gerenciamento Web)</h3>
                     <p className="text-sm text-slate-600 mb-2">Interface gráfica para gerenciar o Linux.</p>
                     <code className="bg-slate-200 px-2 py-1 rounded text-xs block">wget -q -O- http://www.webmin.com/jcameron-key.asc | sudo apt-key add -</code>
                     <code className="bg-slate-200 px-2 py-1 rounded text-xs block mt-1">sudo apt install webmin</code>
                     <p className="text-xs mt-2 font-bold">Acesso: https://45.71.242.131:10000</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-2">PM2 (Monitoramento de Processos)</h3>
                     <p className="text-sm text-slate-600 mb-2">Manter o backend rodando.</p>
                     <code className="bg-slate-200 px-2 py-1 rounded text-xs block">pm2 start server.js --name "lor-api"</code>
                     <code className="bg-slate-200 px-2 py-1 rounded text-xs block mt-1">pm2 startup</code>
                     <code className="bg-slate-200 px-2 py-1 rounded text-xs block mt-1">pm2 save</code>
                 </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center text-slate-500 text-xs mt-10 border-t border-slate-200 pt-4">
            <p>Gerado automaticamente pelo sistema LOR CGR.</p>
            <p>© 2023 LOR CGR Systems. Documento Confidencial.</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ServerSetupGuide;
